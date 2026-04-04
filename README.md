# DocQFlow

A PDF document classifier built with TF-IDF + Logistic Regression, served via FastAPI. Upload a PDF and get back a predicted document class with per-class probabilities.

## Setup

1. Install [uv](https://docs.astral.sh/uv/getting-started/installation/) if you haven't already.

2. Install dependencies:

   ```bash
   uv sync
   ```

3. Copy `.env.example` to `.env` and fill in the MLflow server IP:

   ```bash
   cp .env.example .env
   ```

   Set the `MLFLOW_TRACKING_URI` variable to your MLflow server address.

4. Test the MLflow server connection:

   ```bash
   uv run python main.py
   ```

## Running Locally (without Docker)

1. Train the model (you need PDF files in `data/` organized by class folder):

   ```bash
   uv run python classify.py train --data-dir data
   ```

2. Start the API server:

   ```bash
   uv run uvicorn app:app --reload
   ```

3. Open [http://localhost:8000/docs](http://localhost:8000/docs) to see the interactive API docs.

## Running with Docker

1. Build the image:

   ```bash
   docker build -t docqflow .
   ```

2. Run the container:

   ```bash
   docker run --name docqflow -p 8000:8000 docqflow
   ```

The API will be available at [http://localhost:8000](http://localhost:8000).

## Pushing to Google Artifact Registry

1. Authenticate Docker with Artifact Registry:

   ```bash
   gcloud auth configure-docker us-central1-docker.pkg.dev
   ```

2. Tag the image:

   ```bash
   docker tag docqflow us-central1-docker.pkg.dev/docqflow/docqflow/docqflow:latest
   ```

3. Push the image:

   ```bash
   docker push us-central1-docker.pkg.dev/docqflow/docqflow/docqflow:latest
   ```

## API Endpoints

### `GET /`

Returns a welcome message.

```bash
curl http://localhost:8000/
```

```json
{"message": "Welcome to DocQFlow — a highly super crazy, amazing, intelligent PDF document classifier and processor."}
```

### `GET /health`

Confirms the model is loaded and ready.

```bash
curl http://localhost:8000/health
```

```json
{"status": "ok", "model_loaded": true}
```

### `POST /predict`

Upload a PDF file and get a classification prediction back.

```bash
curl -X POST http://localhost:8000/predict \
  -F "file=@your_document.pdf"
```

Example response:

```json
{
  "label": "permit-3-8",
  "probabilities": {
    "not-permit-3-8": 0.401,
    "permit-3-8": 0.599
  }
}
```

If the PDF has no extractable text, you'll get a 422 error:

```json
{"detail": "PDF valid but not processable"}
```

## MLflow Tracking

Training runs are logged to a remote MLflow server. The tracking URI is set via the `MLFLOW_TRACKING_URI` environment variable in `.env`.

Each training run logs to the `doc-classifier` experiment with:

- **Params**: `max_features`, `ngram_range`, `max_iter`, `train_size`, `test_size`
- **Metrics**: `accuracy`, `macro_precision`, `macro_recall`, `macro_f1`
- **Artifacts**: the trained scikit-learn model

## Project Structure

```text
docqflow/
├── app.py           # FastAPI endpoints (/, /health, /predict)
├── classify.py      # Model training, prediction, and text extraction
├── main.py          # MLflow connection test script
├── Dockerfile       # Container setup for the classifier API
├── pyproject.toml   # Project metadata and dependencies
├── .env             # Environment variables (MLFLOW_TRACKING_URI)
├── models/          # Trained model artifacts (model.joblib)
├── data/            # Training PDFs organized by class folder
└── docs/            # Additional documentation
```
