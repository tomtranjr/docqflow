"""Pipeline-facing API routes (Stages 4-6 era).

Productionized in docqflow-2qr.2: PDFs go to GCS, persistence goes to Supabase
Postgres, and routes are gated by a Supabase JWT auth dependency. The legacy
classifier endpoints in ``routes.py`` continue to use SQLite — they are not
affected by this swap.
"""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

import pypdf.errors
from fastapi import APIRouter, Depends, Form, HTTPException, Request, UploadFile

from src.api.auth import get_current_user_id
from src.api.documents_pg import upsert_document
from src.api.gcs_storage import upload_pdf_if_absent
from src.api.pdf_storage import compute_sha256
from src.api.pipeline_runs_pg import (
    get_latest_pipeline_run_for_user,
    insert_pipeline_run,
)
from src.pipeline.extract import NotAnAcroForm
from src.pipeline.llm_profiles import REGISTRY, _is_reachable, available_profiles
from src.pipeline.orchestrator import run_pipeline
from src.pipeline.schemas import LLMProfileInfo, PipelineResult

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB; matches the /api/predict cap

router = APIRouter()


@router.get("/llm/profiles", response_model=list[LLMProfileInfo])
def list_llm_profiles() -> list[LLMProfileInfo]:
    """Return all registered LLM profiles with current reachability."""
    return available_profiles()


@router.post("/documents/process", response_model=PipelineResult)
async def process_document(
    request: Request,
    file: UploadFile,
    profile: Annotated[str, Form()],
    user_id: Annotated[UUID, Depends(get_current_user_id)],
) -> PipelineResult:
    """Run Stages 4-6 against the uploaded AcroForm PDF and return a verdict.

    Pre-flights the profile before reading the file body so unknown / unreachable
    profiles fail fast without buffering up to 20 MB. Returns 422 for flat /
    non-AcroForm PDFs (Stage 4 raises ``NotAnAcroForm``). Persists to GCS +
    Supabase Postgres only after the pipeline succeeds, so reject paths leave
    no orphan blobs or rows.
    """
    if profile not in REGISTRY:
        raise HTTPException(status_code=422, detail=f"unknown profile: {profile}")
    if not _is_reachable(REGISTRY[profile]):
        raise HTTPException(
            status_code=422,
            detail=f"profile {profile} is not reachable (missing API key?)",
        )

    pdf_bytes = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(pdf_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit",
        )
    if not pdf_bytes:
        raise HTTPException(status_code=422, detail="Empty file")

    gazetteer = getattr(request.app.state, "gazetteer", None)
    if gazetteer is None:
        raise HTTPException(
            status_code=503, detail="Gazetteer not loaded; service starting up"
        )

    try:
        result = await run_pipeline(pdf_bytes, profile, gazetteer=gazetteer)
    except NotAnAcroForm as exc:
        raise HTTPException(
            status_code=422,
            detail="PDF is not an AcroForm (likely scanned or flattened)",
        ) from exc
    except pypdf.errors.PyPdfError as exc:
        raise HTTPException(
            status_code=422,
            detail="File is not a readable PDF",
        ) from exc

    # Pipeline succeeded — only now is it safe to upload + persist so 422 / 503
    # reject paths don't leave orphan GCS blobs or documents rows.
    sha = compute_sha256(pdf_bytes)
    gcs_path = upload_pdf_if_absent(sha, pdf_bytes)
    document_id = await upsert_document(
        uploaded_by=user_id,
        sha256=sha,
        filename=file.filename or f"{sha}.pdf",
        size_bytes=len(pdf_bytes),
        gcs_path=gcs_path,
    )
    result = result.model_copy(update={"sha256": sha, "document_id": document_id})
    await insert_pipeline_run(document_id=document_id, result=result)

    return result


@router.get("/documents/{sha256}", response_model=PipelineResult)
async def get_pipeline_run_by_sha(
    sha256: str,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
) -> PipelineResult:
    """Return the latest persisted PipelineResult for the user's document.

    Frontend Review.tsx fetches this after upload to render the real Stages 4-6
    output without re-uploading. Scoped to the calling user — a sha256 owned
    by another user (or never processed) returns 404, matching RLS.
    """
    row = await get_latest_pipeline_run_for_user(uploaded_by=user_id, sha256=sha256)
    if row is None:
        raise HTTPException(status_code=404, detail="No pipeline run for this document")
    return PipelineResult.model_validate(row)
