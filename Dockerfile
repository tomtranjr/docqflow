FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir fastapi uvicorn httpx

COPY FastAPI_Lab.py .

EXPOSE 8000

CMD ["uvicorn", "FastAPI_Lab:app", "--host", "0.0.0.0", "--port", "8000"]