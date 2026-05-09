"""Pipeline-facing API routes (Stages 4-6 era).

Exposes LLM profile discovery and the synchronous pipeline endpoint that runs
Stages 4-6 (extract → validate → reason) against an uploaded AcroForm PDF.
"""

from __future__ import annotations

import pypdf.errors
from fastapi import APIRouter, Form, HTTPException, Request, UploadFile

from src.api.documents import upsert_document
from src.api.pdf_storage import compute_sha256, save_pdf
from src.api.pipeline_runs import get_pipeline_run, upsert_pipeline_run
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
    profile: str = Form(...),
) -> PipelineResult:
    """Run Stages 4-6 against the uploaded AcroForm PDF and return a verdict.

    Pre-flights the profile before reading the file body so unknown / unreachable
    profiles fail fast without buffering up to 20 MB. Returns 422 for flat /
    non-AcroForm PDFs (Stage 4 raises ``NotAnAcroForm``).
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

    # Pipeline succeeded — only now is it safe to persist the PDF and metadata
    # so 422 / 503 reject paths don't leave orphan files or documents rows.
    sha = compute_sha256(pdf_bytes)
    save_pdf(pdf_bytes, sha)
    await upsert_document(sha, len(pdf_bytes))
    result = result.model_copy(update={"sha256": sha})
    await upsert_pipeline_run(sha, result)

    return result


@router.get("/documents/{sha256}", response_model=PipelineResult)
async def get_pipeline_run_by_sha(sha256: str) -> PipelineResult:
    """Return the latest persisted PipelineResult for a document, keyed by sha256.

    Frontend Review.tsx fetches this after upload to render the real Stages 4-6
    output (verdict + extracted_fields + issues) instead of the synthetic
    placeholder. 404 if the document has never been processed through the
    pipeline endpoint (legacy classify-only uploads, or unknown sha).
    """
    row = await get_pipeline_run(sha256)
    if row is None:
        raise HTTPException(status_code=404, detail="No pipeline run for this document")
    return PipelineResult.model_validate(row)
