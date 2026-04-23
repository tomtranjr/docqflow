# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python runtime
FROM python:3.11-slim
RUN useradd --create-home --shell /usr/sbin/nologin appuser

WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir .
COPY app.py classify.py server.py ./
COPY src/ src/
COPY models/ models/
COPY --from=frontend-build /app/frontend/dist frontend/dist
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8080
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080"]
