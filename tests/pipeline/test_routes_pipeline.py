"""Functional tests for POST /api/documents/process (Postgres + GCS + Auth).

Covers the docqflow-2qr.2 prod-swap acceptance criteria:
- happy path persists rows
- same-sha-from-same-user dedupes (one documents row, two pipeline_runs)
- 422 flat
- 422 unknown / unreachable profile
- 401 without token

Uses ``httpx.AsyncClient`` over ``ASGITransport`` against the live FastAPI
app. GCS, Supabase Postgres, and the LLM judge are all replaced with
in-memory fakes so no real infra is touched.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from src import server
from src.api.auth import get_current_user_id
from src.pipeline import reason as reason_mod
from src.pipeline.gazetteer import Gazetteer
from src.pipeline.reason import JudgeResponse

CORPUS_PDF = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "permit-3-8"
    / "permit-3-8_correct_202602125866.pdf"
)

TEST_USER = UUID("11111111-2222-4333-8444-555555555666")


@pytest.fixture
def corpus_pdf_bytes() -> bytes:
    """Bytes of a known-clean corpus PDF; skip if the corpus isn't checked out."""
    if not CORPUS_PDF.exists():
        pytest.skip(f"corpus PDF not available at {CORPUS_PDF}")
    return CORPUS_PDF.read_bytes()


@pytest.fixture
def mocked_judge(monkeypatch: pytest.MonkeyPatch) -> None:
    """Stub ``reason.judge`` so Stage 6 doesn't try to call OpenAI."""

    async def fake_judge(profile, *, system, user, schema):
        return JudgeResponse(verdict="ok", confidence=0.9, message="mocked")

    monkeypatch.setattr(reason_mod, "judge", fake_judge)


@pytest.fixture
def reachable_profile(monkeypatch: pytest.MonkeyPatch) -> None:
    """Force the cloud-fast profile reachable so pre-flight passes."""
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")


@pytest.fixture
def fake_persistence(monkeypatch: pytest.MonkeyPatch) -> dict[str, Any]:
    """In-memory replacements for GCS upload + Postgres reads/writes.

    Returns a dict the test can assert on: ``documents`` keyed by
    ``(uploaded_by, sha256)`` (mirrors the unique index), ``pipeline_runs``
    as an append-only list, and ``gcs_uploads`` recording the shas we
    pretended to upload.
    """
    state: dict[str, Any] = {
        "documents": {},
        "pipeline_runs": [],
        "gcs_uploads": [],
    }

    def fake_upload(sha256: str, data: bytes) -> str:
        state["gcs_uploads"].append(sha256)
        return f"gs://docqflow-pdfs-dev/originals/{sha256}.pdf"

    async def fake_upsert_document(
        *, uploaded_by, sha256, filename, size_bytes, gcs_path
    ):
        key = (uploaded_by, sha256)
        if key not in state["documents"]:
            state["documents"][key] = uuid4()
        return state["documents"][key]

    async def fake_insert_pipeline_run(*, document_id, result):
        run_id = uuid4()
        state["pipeline_runs"].append(
            {
                "id": run_id,
                "document_id": document_id,
                "llm_profile": result.llm_profile,
                "verdict": result.verdict,
                "extracted_fields": result.extracted_fields,
                "issues": [i.model_dump() for i in result.issues],
                "latency_ms": result.latency_ms,
            }
        )
        return run_id

    async def fake_get_latest(*, uploaded_by, sha256):
        doc_id = state["documents"].get((uploaded_by, sha256))
        if doc_id is None:
            return None
        for run in reversed(state["pipeline_runs"]):
            if run["document_id"] == doc_id:
                return {
                    "document_id": str(doc_id),
                    "sha256": sha256,
                    "llm_profile": run["llm_profile"],
                    "verdict": run["verdict"],
                    "extracted_fields": run["extracted_fields"],
                    "issues": run["issues"],
                    "latency_ms": run["latency_ms"],
                }
        return None

    monkeypatch.setattr("src.api.routes_pipeline.upload_pdf_if_absent", fake_upload)
    monkeypatch.setattr("src.api.routes_pipeline.upsert_document", fake_upsert_document)
    monkeypatch.setattr(
        "src.api.routes_pipeline.insert_pipeline_run", fake_insert_pipeline_run
    )
    monkeypatch.setattr(
        "src.api.routes_pipeline.get_latest_pipeline_run_for_user", fake_get_latest
    )
    return state


@pytest.fixture
def app_with_gazetteer():
    """Ensure ``app.state.gazetteer`` is set before tests; clean up overrides after."""
    server.app.state.gazetteer = Gazetteer.load()
    yield server.app
    server.app.dependency_overrides.clear()


@pytest.fixture
async def authed_client(
    app_with_gazetteer, fake_persistence, mocked_judge, reachable_profile
):
    """AsyncClient with the auth dep overridden to return ``TEST_USER``."""
    server.app.dependency_overrides[get_current_user_id] = lambda: TEST_USER
    transport = ASGITransport(app=server.app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
async def unauthed_client(app_with_gazetteer):
    """AsyncClient with no auth override — exercises the real JWT dep (expect 401)."""
    transport = ASGITransport(app=server.app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def test_process_happy_path_persists_rows(
    authed_client: AsyncClient,
    fake_persistence: dict[str, Any],
    corpus_pdf_bytes: bytes,
) -> None:
    """A correct-corpus PDF runs Stages 4-6, returns a full PipelineResult, and persists."""
    response = await authed_client.post(
        "/api/documents/process",
        files={"file": ("permit.pdf", corpus_pdf_bytes, "application/pdf")},
        data={"profile": "cloud-fast"},
    )
    assert response.status_code == 200, response.text

    body = response.json()
    assert body["llm_profile"] == "cloud-fast"
    assert body["verdict"] in {"clean", "minor", "major"}
    assert isinstance(body["latency_ms"], int) and body["latency_ms"] >= 0
    assert isinstance(body["extracted_fields"], dict)
    assert isinstance(body["issues"], list)
    assert isinstance(body["document_id"], str)
    assert isinstance(body["sha256"], str) and len(body["sha256"]) == 64

    assert len(fake_persistence["documents"]) == 1
    assert len(fake_persistence["pipeline_runs"]) == 1
    assert len(fake_persistence["gcs_uploads"]) == 1


async def test_process_same_user_same_sha_dedupes_documents(
    authed_client: AsyncClient,
    fake_persistence: dict[str, Any],
    corpus_pdf_bytes: bytes,
) -> None:
    """Re-uploading the same PDF as the same user keeps one documents row, two pipeline_runs."""
    r1 = await authed_client.post(
        "/api/documents/process",
        files={"file": ("permit.pdf", corpus_pdf_bytes, "application/pdf")},
        data={"profile": "cloud-fast"},
    )
    r2 = await authed_client.post(
        "/api/documents/process",
        files={"file": ("permit.pdf", corpus_pdf_bytes, "application/pdf")},
        data={"profile": "cloud-fast"},
    )
    assert r1.status_code == 200, r1.text
    assert r2.status_code == 200, r2.text
    assert r1.json()["document_id"] == r2.json()["document_id"]

    assert len(fake_persistence["documents"]) == 1
    assert len(fake_persistence["pipeline_runs"]) == 2


async def test_process_rejects_flat_pdf(
    authed_client: AsyncClient,
    fake_persistence: dict[str, Any],
    sample_pdf_bytes: bytes,
) -> None:
    """A flat PDF (no AcroForm) is rejected with 422; nothing is persisted."""
    response = await authed_client.post(
        "/api/documents/process",
        files={"file": ("flat.pdf", sample_pdf_bytes, "application/pdf")},
        data={"profile": "cloud-fast"},
    )
    assert response.status_code == 422, response.text
    assert "AcroForm" in response.json()["detail"]
    assert fake_persistence["documents"] == {}
    assert fake_persistence["pipeline_runs"] == []
    assert fake_persistence["gcs_uploads"] == []


async def test_process_rejects_unknown_profile(
    authed_client: AsyncClient,
    fake_persistence: dict[str, Any],
    corpus_pdf_bytes: bytes,
) -> None:
    """A profile name not in REGISTRY fails pre-flight with 422."""
    response = await authed_client.post(
        "/api/documents/process",
        files={"file": ("permit.pdf", corpus_pdf_bytes, "application/pdf")},
        data={"profile": "bogus-profile"},
    )
    assert response.status_code == 422, response.text
    assert "unknown profile" in response.json()["detail"]
    assert fake_persistence["documents"] == {}


async def test_process_rejects_unreachable_profile(
    app_with_gazetteer,
    fake_persistence: dict[str, Any],
    mocked_judge,
    monkeypatch: pytest.MonkeyPatch,
    corpus_pdf_bytes: bytes,
) -> None:
    """When OPENAI_API_KEY is missing, the profile pre-flight returns 422."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    server.app.dependency_overrides[get_current_user_id] = lambda: TEST_USER
    transport = ASGITransport(app=server.app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/documents/process",
            files={"file": ("permit.pdf", corpus_pdf_bytes, "application/pdf")},
            data={"profile": "cloud-fast"},
        )
    assert response.status_code == 422, response.text
    assert "not reachable" in response.json()["detail"]


async def test_process_requires_auth(
    unauthed_client: AsyncClient, corpus_pdf_bytes: bytes
) -> None:
    """No Authorization header => 401, with WWW-Authenticate hint."""
    response = await unauthed_client.post(
        "/api/documents/process",
        files={"file": ("permit.pdf", corpus_pdf_bytes, "application/pdf")},
        data={"profile": "cloud-fast"},
    )
    assert response.status_code == 401, response.text
    assert response.headers.get("www-authenticate", "").lower() == "bearer"
    assert "Authorization" in response.json()["detail"]


async def test_get_current_user_id_bypassed_when_disable_auth_flag_set(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Temp (docqflow-h39): DOCQFLOW_DISABLE_AUTH bypasses JWT, returns dev UUID."""
    monkeypatch.setenv("DOCQFLOW_DISABLE_AUTH", "true")
    from src.api.auth import _DEV_USER_ID

    result = await get_current_user_id(authorization=None)
    assert result == _DEV_USER_ID


async def test_get_document_happy_path(
    authed_client: AsyncClient,
    fake_persistence: dict[str, Any],
    corpus_pdf_bytes: bytes,
) -> None:
    """After POST, GET /api/documents/{sha} returns the same payload, scoped to the user."""
    post = await authed_client.post(
        "/api/documents/process",
        files={"file": ("permit.pdf", corpus_pdf_bytes, "application/pdf")},
        data={"profile": "cloud-fast"},
    )
    assert post.status_code == 200
    sha = post.json()["sha256"]

    response = await authed_client.get(f"/api/documents/{sha}")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["sha256"] == sha
    assert body["verdict"] == post.json()["verdict"]
    assert body["llm_profile"] == "cloud-fast"


async def test_get_document_404_when_no_run(
    authed_client: AsyncClient, fake_persistence: dict[str, Any]
) -> None:
    """A sha256 that this user never processed returns 404."""
    bogus_sha = "0" * 64
    response = await authed_client.get(f"/api/documents/{bogus_sha}")
    assert response.status_code == 404, response.text
    assert "pipeline run" in response.json()["detail"].lower()
