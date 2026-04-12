from fastapi import FastAPI, HTTPException, UploadFile
from pydantic import BaseModel

from classify import extract_text_from_bytes, load_model, predict_from_text

app = FastAPI(title="DocQFlow", description="PDF document classifier API")
pipeline = load_model()


class PredictionResponse(BaseModel):
    """Response model for PDF classification predictions."""

    label: str
    probabilities: dict[str, float]


@app.get("/")
def root():
    """Return a welcome message for the API."""
    return {
        "message": "Welcome to DocQFlow — a highly super crazy, amazing, intelligent PDF document classifier and processor."
    }


@app.get("/health")
def health():
    """Return service health status and whether the model is loaded."""
    return {"status": "ok", "model_loaded": pipeline is not None}


@app.post("/predict", response_model=PredictionResponse)
async def predict_pdf(file: UploadFile):
    """Accept a PDF upload and return the predicted document class with probabilities."""
    if pipeline is None:
        raise HTTPException(
            status_code=503, detail="Model not loaded. Train a model first."
        )

    pdf_bytes = await file.read()
    text = extract_text_from_bytes(pdf_bytes)

    if not text.strip():
        raise HTTPException(status_code=422, detail="PDF valid but not processable")

    return predict_from_text(pipeline, text)
