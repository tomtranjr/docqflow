FROM python:3.11-slim

WORKDIR /app

# Install dependencies from pyproject.toml via pip
COPY pyproject.toml .
RUN pip install --no-cache-dir .

# Copy application code
COPY classify.py app.py ./

# Copy trained model
COPY models/ models/

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
