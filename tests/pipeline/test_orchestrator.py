"""Integration tests for `run_pipeline` against the labeled corpus.

Walks every PDF in `data/permit-3-8/`, runs Stages 4-6 with the LLM mocked at
the `reason.judge` boundary, and checks that the verdict + emitted issues line
up with `labels.json`.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from src.pipeline import gazetteer as gazetteer_module
from src.pipeline import reason as reason_mod
from src.pipeline.gazetteer import Gazetteer
from src.pipeline.orchestrator import run_pipeline
from src.pipeline.reason import JudgeResponse
from src.pipeline.schemas import PipelineResult

CORPUS_DIR = Path(__file__).resolve().parents[2] / "data" / "permit-3-8"
LABELS_PATH = CORPUS_DIR / "labels.json"
GAZETTEER_CSV = (
    Path(__file__).resolve().parents[2] / "data" / "gazetteer" / "sf_parcels.csv"
)

# Kinds detected by Stage 6 LLM (rather than Stage 5 deterministic rules).
LLM_KINDS = frozenset(
    {"cost_scope_mismatch", "description_mismatch_bank_form_3_phrasing"}
)


def _load_labels() -> dict[str, dict]:
    with LABELS_PATH.open() as f:
        return json.load(f)


def _expected_llm_kind(label: dict) -> str | None:
    """Return the mutated kind iff it's an LLM-detected kind for a major doc."""
    if label["flavor"] != "major":
        return None
    if not label["mutations"]:
        return None
    kind = label["mutations"][0]["kind"]
    return kind if kind in LLM_KINDS else None


@pytest.fixture
def gazetteer() -> Gazetteer:
    return Gazetteer.load(GAZETTEER_CSV)


@pytest.fixture
def mock_judge(monkeypatch: pytest.MonkeyPatch):
    """Patch `reason.judge` with a stub that flags only when the current
    document's ground-truth mutation is the one being judged.

    The orchestrator calls each judge with a different system prompt; we
    branch on a stable substring to identify which judge is asking.
    """
    state: dict[str, str | None] = {"flag_kind": None}

    async def fake_judge(profile, *, system, user, schema):
        assert schema is JudgeResponse, "unexpected schema requested by judge"
        flag_kind = state["flag_kind"]
        if "estimated cost of the job" in system:
            judge_kind = "cost_scope_mismatch"
        elif "Form 3" in system:
            judge_kind = "description_mismatch_bank_form_3_phrasing"
        else:  # pragma: no cover — defensive: a new judge was added
            raise AssertionError(f"unrecognized judge system prompt: {system[:80]!r}")

        if flag_kind == judge_kind:
            return JudgeResponse(
                verdict="flag",
                confidence=0.9,
                message=f"mocked flag for {judge_kind}",
            )
        return JudgeResponse(verdict="ok", confidence=0.9, message="mocked ok")

    monkeypatch.setattr(reason_mod, "judge", fake_judge)
    return state


@pytest.fixture(autouse=True)
def _reset_gazetteer_singleton(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(gazetteer_module, "_instance", None)


@pytest.mark.asyncio
async def test_run_pipeline_corpus_verdict_and_kinds(
    gazetteer: Gazetteer, mock_judge: dict[str, str | None]
) -> None:
    labels = _load_labels()

    deterministic_total = 0
    deterministic_match = 0
    major_llm_failures: list[str] = []

    for filename, label in labels.items():
        pdf_path = CORPUS_DIR / filename
        if not pdf_path.exists():
            continue

        mock_judge["flag_kind"] = _expected_llm_kind(label)

        result = await run_pipeline(
            pdf_path.read_bytes(),
            profile="cloud-fast",
            gazetteer=gazetteer,
        )

        assert isinstance(result, PipelineResult)
        assert result.llm_profile == "cloud-fast"
        assert result.latency_ms >= 0

        flavor = label["flavor"]
        if flavor in {"correct", "minor"}:
            deterministic_total += 1
            expected_verdict = "clean" if flavor == "correct" else "minor"
            if result.verdict == expected_verdict:
                deterministic_match += 1
        elif flavor == "major" and _expected_llm_kind(label) is not None:
            # Spec: for major docs flagged by the (mocked) LLM, assert the
            # ground-truth kind shows up. Rule-based majors (e.g.
            # address_block_lot_mismatch) depend on gazetteer coverage, not
            # the orchestrator, and are out of scope for this assertion.
            assert result.verdict == "major", (
                f"{filename}: expected major verdict, got {result.verdict}"
            )
            ground_truth_kind = label["mutations"][0]["kind"]
            emitted_kinds = {issue.kind for issue in result.issues}
            if ground_truth_kind not in emitted_kinds:
                major_llm_failures.append(
                    f"{filename}: missing kind={ground_truth_kind} "
                    f"(got {sorted(emitted_kinds)})"
                )

    assert deterministic_total > 0, "corpus produced no correct/minor docs"
    accuracy = deterministic_match / deterministic_total
    assert accuracy >= 0.95, (
        f"deterministic accuracy {accuracy:.2%} "
        f"({deterministic_match}/{deterministic_total}) below 95% threshold"
    )
    assert not major_llm_failures, (
        "major docs missed ground-truth kinds:\n" + "\n".join(major_llm_failures)
    )


@pytest.mark.asyncio
async def test_run_pipeline_propagates_not_an_acroform(
    gazetteer: Gazetteer, mock_judge: dict[str, str | None]
) -> None:
    from src.pipeline.extract import NotAnAcroForm

    flat_pdf = Path(__file__).resolve().parent / "fixtures" / "flat.pdf"
    if not flat_pdf.exists():
        pytest.skip("flat.pdf fixture not present")

    with pytest.raises(NotAnAcroForm):
        await run_pipeline(
            flat_pdf.read_bytes(), profile="cloud-fast", gazetteer=gazetteer
        )


@pytest.mark.asyncio
async def test_run_pipeline_rolls_up_to_major_when_llm_flags(
    gazetteer: Gazetteer, mock_judge: dict[str, str | None]
) -> None:
    labels = _load_labels()
    major_files = [
        fn
        for fn, label in labels.items()
        if label["flavor"] == "major"
        and _expected_llm_kind(label) is not None
        and (CORPUS_DIR / fn).exists()
    ]
    assert major_files, "expected at least one LLM-flagable major doc in corpus"

    filename = major_files[0]
    mock_judge["flag_kind"] = _expected_llm_kind(labels[filename])
    result = await run_pipeline(
        (CORPUS_DIR / filename).read_bytes(),
        profile="cloud-fast",
        gazetteer=gazetteer,
    )
    assert result.verdict == "major"
    assert any(i.severity == "major" and i.source == "llm" for i in result.issues)
