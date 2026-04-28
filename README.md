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
   uv run python scripts/check_mlflow.py
   ```

## Running Locally (without Docker)

1. Train the model (you need PDF files in `data/` organized by class folder):

   ```bash
   uv run python -m src.classifier train --data-dir data
   ```

   For the full training guide (folder structure, CLI options, how the model works, and MLflow logging), see [docs/model-training.md](docs/model-training.md).

   To generate training PDFs from SF Data Portal data (correct + minor-error + major-error variants for the validation pipeline), see [docs/permit-generation.md](docs/permit-generation.md).

2. Start the API server:

   ```bash
   uv run uvicorn src.server:app --reload
   ```

3. Open [http://localhost:8000/docs](http://localhost:8000/docs) to see the interactive API docs.

## Running with Docker

1. Build the image:

   ```bash
   docker build -t docqflow .
   ```

2. Run the container:

   ```bash
   docker run --name docqflow -p 8080:8080 docqflow
   ```

The API will be available at [http://localhost:8080](http://localhost:8080).

To push the image to Google Artifact Registry, see [docs/docker-registry.md](docs/docker-registry.md).

## API Endpoints

### `GET /api/health`

Confirms the model is loaded and ready.

```bash
curl http://localhost:8000/api/health
```

```json
{"status": "ok", "model_loaded": true}
```

### `POST /api/predict`

Upload a PDF file and get a classification prediction back.

```bash
curl -X POST http://localhost:8000/api/predict \
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
├── src/
│   ├── server.py             # FastAPI app + lifespan + static mount
│   ├── classifier.py         # Model training, prediction, and text extraction
│   └── api/
│       ├── routes.py         # All HTTP endpoints (/api/predict, /api/health, /api/history, /api/stats)
│       ├── models.py         # Pydantic response models
│       └── database.py       # SQLite (aiosqlite) persistence layer
├── scripts/
│   ├── generate_permits.py   # Form 3-8 training data generator (correct/minor/major flavors)
│   └── check_mlflow.py       # MLflow connection smoke test
├── tests/                    # pytest suite + conftest
├── frontend/                 # React SPA (Vite + TypeScript)
├── Dockerfile                # Container setup for the classifier API
├── pyproject.toml            # Project metadata and dependencies
├── .pre-commit-config.yaml   # Pre-commit hook configuration
├── CONTRIBUTING.md           # Development setup and code style guide
├── .env.example              # Environment variable template (MLFLOW_TRACKING_URI)
├── models/                   # Trained model artifacts (model.joblib)
├── data/                     # Training PDFs organized by class folder
└── docs/
    ├── model-training.md     # Training guide, CLI options, and MLflow logging
    ├── permit-generation.md  # Training data generator guide (flavors, mutations, labels.json)
    └── docker-registry.md    # Pushing images to Google Artifact Registry
```
