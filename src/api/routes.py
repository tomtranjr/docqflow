import json
from json import JSONDecodeError

import fitz
from fastapi import APIRouter, HTTPException, Request, UploadFile

from src.classifier import extract_text_from_bytes, predict_from_text

from .database import get_classification, get_history, get_stats, save_classification
from .models import HistoryEntry, HistoryResponse, PredictionResponse, StatsResponse

router = APIRouter()


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

    pdf_bytes = await file.read()
    try:
        text = extract_text_from_bytes(pdf_bytes)
    except fitz.FileDataError as exc:
        raise HTTPException(
            status_code=422, detail="File is not a readable PDF"
        ) from exc

    if not text.strip():
        raise HTTPException(status_code=422, detail="PDF valid but not processable")

    result = predict_from_text(pipeline, text)

    confidence = max(result["probabilities"].values())
    await save_classification(
        filename=file.filename or "unknown.pdf",
        label=result["label"],
        confidence=confidence,
        probabilities=result["probabilities"],
        text_preview=text[:500] if text else None,
        file_size=len(pdf_bytes),
    )

    return result


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
        probs = item["probabilities"]
        if isinstance(probs, str):
            try:
                probs = json.loads(probs)
            except JSONDecodeError:
                probs = {}
        items.append(HistoryEntry(**{**item, "probabilities": probs}))
    return HistoryResponse(items=items, total=result["total"], page=result["page"])


@router.get("/history/{entry_id}", response_model=HistoryEntry)
async def get_history_entry(entry_id: int):
    result = await get_classification(entry_id)
    if not result:
        raise HTTPException(status_code=404, detail="Classification not found")
    probs = result["probabilities"]
    if isinstance(probs, str):
        try:
            probs = json.loads(probs)
        except JSONDecodeError:
            probs = {}
    return HistoryEntry(**{**result, "probabilities": probs})


@router.get("/stats", response_model=StatsResponse)
async def stats():
    return await get_stats()
