"""Pipeline-facing API routes (Stages 4-6 era).

Exposes LLM profile discovery and the synchronous pipeline endpoint that runs
Stages 4-6 (extract → validate → reason) against an uploaded AcroForm PDF.
"""

from __future__ import annotations

import pypdf.errors
from fastapi import APIRouter, Form, HTTPException, Request, UploadFile

from src.api.documents import upsert_document
from src.api.pdf_storage import compute_sha256, save_pdf
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

    sha = compute_sha256(pdf_bytes)
    save_pdf(pdf_bytes, sha)
    await upsert_document(sha, len(pdf_bytes))

    gazetteer = getattr(request.app.state, "gazetteer", None)
    if gazetteer is None:
        raise HTTPException(
            status_code=503, detail="Gazetteer not loaded; service starting up"
        )

    try:
        return await run_pipeline(pdf_bytes, profile, gazetteer=gazetteer)
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
