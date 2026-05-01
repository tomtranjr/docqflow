import json
import re
from json import JSONDecodeError

import fitz
from fastapi import APIRouter, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse

from src.classifier import extract_text_from_bytes, predict_from_text

from .completeness import evaluate as evaluate_completeness
from .database import (
    get_classification,
    get_history,
    get_stats,
    save_classification,
)
from .documents import upsert_document
from .models import (
    Completeness,
    ExtractedFields,
    ExtractedFieldsResponse,
    HistoryEntry,
    HistoryResponse,
    PredictionResponse,
    StatsResponse,
)
from .pdf_fields import extract_form_3_8_fields
from .pdf_storage import compute_sha256, pdf_path, save_pdf

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB; matches the frontend hint


def _parse_probs(raw) -> dict:
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
        except JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return raw if isinstance(raw, dict) else {}


router = APIRouter()

_FILENAME_UNSAFE = re.compile(r'[\r\n"\\]')


def _safe_disposition_filename(filename: str) -> str:
    """Strip CRLF, quotes, and backslashes from filenames before reflecting them
    into Content-Disposition. Prevents response header injection."""
    return _FILENAME_UNSAFE.sub("_", filename)


@router.get("/health")
def health(request: Request):
    pipeline = getattr(request.app.state, "pipeline", None)
    return {"status": "ok", "model_loaded": pipeline is not None}


@router.post("/predict", response_model=PredictionResponse)
async def predict_pdf(request: Request, file: UploadFile):
    pipeline = getattr(request.app.state, "pipeline", None)
    if pipeline is None:
        raise HTTPException(
            status_code=503, detail="Model not loaded. Train a model first."
        )

    pdf_bytes = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(pdf_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit",
        )
    try:
        text = extract_text_from_bytes(pdf_bytes)
    except fitz.FileDataError as exc:
        raise HTTPException(
            status_code=422, detail="File is not a readable PDF"
        ) from exc

    if not text.strip():
        raise HTTPException(status_code=422, detail="PDF valid but not processable")

    sha = compute_sha256(pdf_bytes)
    save_pdf(pdf_bytes, sha)
    await upsert_document(sha, len(pdf_bytes))

    result = predict_from_text(pipeline, text)
    confidence = max(result["probabilities"].values())

    new_id = await save_classification(
        filename=file.filename or "unknown.pdf",
        label=result["label"],
        confidence=confidence,
        probabilities=result["probabilities"],
        text_preview=text[:500] if text else None,
        file_size=len(pdf_bytes),
        pdf_sha256=sha,
    )

    return {
        "id": new_id,
        "label": result["label"],
        "probabilities": result["probabilities"],
        "pdf_sha256": sha,
    }


@router.get("/history", response_model=HistoryResponse)
async def list_history(
    page: int = 1,
    limit: int = 25,
    label: str | None = None,
    search: str | None = None,
):
    if page < 1:
        raise HTTPException(status_code=422, detail="page must be >= 1")
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=422, detail="limit must be between 1 and 100")
    result = await get_history(page, limit, label, search)
    items = []
    for item in result["items"]:
        probs = _parse_probs(item["probabilities"])
        items.append(HistoryEntry(**{**item, "probabilities": probs}))
    return HistoryResponse(items=items, total=result["total"], page=result["page"])


@router.get("/history/{entry_id}", response_model=HistoryEntry)
async def get_history_entry(entry_id: int):
    result = await get_classification(entry_id)
    if not result:
        raise HTTPException(status_code=404, detail="Classification not found")
    probs = _parse_probs(result["probabilities"])
    return HistoryEntry(**{**result, "probabilities": probs})


@router.get("/stats", response_model=StatsResponse)
async def stats():
    return await get_stats()


@router.get("/classifications/{classification_id}", response_model=HistoryEntry)
async def get_classification_metadata(classification_id: int):
    result = await get_classification(classification_id)
    if not result:
        raise HTTPException(status_code=404, detail="Classification not found")
    probs = _parse_probs(result["probabilities"])
    return HistoryEntry(**{**result, "probabilities": probs})


@router.get(
    "/classifications/{classification_id}/fields",
    response_model=ExtractedFieldsResponse,
)
async def get_classification_fields(classification_id: int):
    """Return Form 3-8 AcroForm extraction + completeness for a stored PDF."""
    row = await get_classification(classification_id)
    if not row:
        raise HTTPException(status_code=404, detail="Classification not found")
    sha = row.get("pdf_sha256")
    if not sha:
        return JSONResponse(
            status_code=410,
            content={
                "error_code": "pdf_missing",
                "message": "PDF unavailable for legacy submission",
            },
        )
    path = pdf_path(sha)
    try:
        with open(path, "rb") as f:
            pdf_bytes = f.read()
    except FileNotFoundError:
        return JSONResponse(
            status_code=410,
            content={
                "error_code": "pdf_missing",
                "message": "PDF file missing on disk",
            },
        )
    fields_dict = extract_form_3_8_fields(pdf_bytes)
    completeness = evaluate_completeness(fields_dict)
    return ExtractedFieldsResponse(
        fields=ExtractedFields(**fields_dict),
        completeness=Completeness(
            passed=completeness.passed, missing=completeness.missing
        ),
    )


@router.get("/classifications/{classification_id}/pdf")
async def get_classification_pdf(classification_id: int):
    row = await get_classification(classification_id)
    if not row:
        raise HTTPException(status_code=404, detail="Classification not found")
    sha = row.get("pdf_sha256")
    if not sha:
        return JSONResponse(
            status_code=410,
            content={
                "error_code": "pdf_missing",
                "message": "PDF unavailable for legacy submission",
            },
        )
    path = pdf_path(sha)
    safe_name = _safe_disposition_filename(row["filename"])
    try:
        return FileResponse(
            path,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{safe_name}"'},
        )
    except FileNotFoundError:
        return JSONResponse(
            status_code=410,
            content={
                "error_code": "pdf_missing",
                "message": "PDF file missing on disk",
            },
        )
