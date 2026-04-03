# docqflow

A PDF document classifier built with TF-IDF + Logistic Regression, served via FastAPI.

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

4. Test the MLflow server connection:

   ```bash
   uv run main.py
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

3. Open `http://localhost:8000/docs` to see the interactive API docs.

For more details on training, prediction, and how the model works, see [docs/model-training.md](docs/model-training.md).

## Running with Docker

1. Build the image:

   ```bash
   docker build -t docqflow .
   ```

2. Run the container:

   ```bash
   docker run --name docqflow -p 8000:8000 docqflow
   ```

The API will be available at `http://localhost:8000`.

To push the image to Google Artifact Registry, see [docs/docker-registry.md](docs/docker-registry.md).

## API Endpoints

### `GET /`

Returns a welcome message.

```bash
curl http://localhost:8000/
```

```json
{"message": "Welcome to DocQFlow — PDF document classifier"}
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

## Project Structure

```
docqflow/
├── app.py           # FastAPI endpoints (/, /health, /predict)
├── classify.py      # Model training, prediction, and text extraction
├── Dockerfile       # Container setup
├── pyproject.toml   # Dependencies
├── models/          # Trained model artifacts
└── data/            # Training PDFs organized by class folder
```
