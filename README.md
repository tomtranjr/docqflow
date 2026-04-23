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

   For the full training guide (folder structure, CLI options, how the model works, and MLflow logging), see [docs/model-training.md](docs/model-training.md).

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

To push the image to Google Artifact Registry, see [docs/docker-registry.md](docs/docker-registry.md).

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

Training runs are logged to a remote MLflow server (set `MLFLOW_TRACKING_URI` in `.env`). Each run records parameters, metrics, and the trained model artifact. See [docs/model-training.md](docs/model-training.md) for the full list of logged values.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, pre-commit hooks, and code style guidelines.

## Project Structure

```text
docqflow/
├── app.py                    # FastAPI endpoints (/, /health, /predict)
├── classify.py               # Model training, prediction, and text extraction
├── main.py                   # MLflow connection test script
├── Dockerfile                # Container setup for the classifier API
├── pyproject.toml            # Project metadata and dependencies
├── .pre-commit-config.yaml   # Pre-commit hook configuration
├── CONTRIBUTING.md           # Development setup and code style guide
├── .env                      # Environment variables (MLFLOW_TRACKING_URI)
├── models/                   # Trained model artifacts (model.joblib)
├── data/                     # Training PDFs organized by class folder
└── docs/
    ├── model-training.md     # Training guide, CLI options, and MLflow logging
    └── docker-registry.md    # Pushing images to Google Artifact Registry
```



hello tom and lokesh i wuv yuouuuuuu :3
