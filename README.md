# docqflow

## Setup

1. Install [uv](https://docs.astral.sh/uv/getting-started/installation/) if you haven't already.

2. Install dependencies:
   ```bash
   uv sync
   ```

3. Copy `.env.example` to `.env` and fill in the MLflow server IP:
   ```bash
   cp .env.example .env
   # Edit .env with your team's GCP external IP
   ```
