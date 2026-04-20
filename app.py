import fitz
from fastapi import APIRouter, HTTPException, UploadFile
from pydantic import BaseModel

from classify import extract_text_from_bytes, predict_from_text
from src.api.database import save_classification

router = APIRouter()


class PredictionResponse(BaseModel):
    label: str
    probabilities: dict[str, float]


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
