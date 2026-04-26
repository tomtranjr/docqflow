import fitz
from fastapi import APIRouter, HTTPException, UploadFile
from pydantic import BaseModel

from classify import extract_text_from_bytes, predict_from_text
from src.api.database import save_classification
from src.api.documents import upsert_document
from src.api.pdf_storage import compute_sha256, save_pdf

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB; matches the frontend hint

router = APIRouter()


class PredictionResponse(BaseModel):
    id: int
    label: str
    probabilities: dict[str, float]
    pdf_sha256: str


@router.get("/health")
def health():
    from server import get_pipeline

    pipeline = get_pipeline()
    return {"status": "ok", "model_loaded": pipeline is not None}


@router.post("/predict", response_model=PredictionResponse)
async def predict_pdf(file: UploadFile):
    from server import get_pipeline

    pipeline = get_pipeline()
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
