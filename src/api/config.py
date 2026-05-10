"""Centralized settings loaded from environment."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    db_path: str
    pdf_dir: str
    llm_base_url: str
    llm_api_key: str
    llm_model: str
    llm_timeout_seconds: int
    extraction_prompt_version: int
    # Pipeline prod-swap (docqflow-2qr.2): GCS + Supabase Postgres + Auth + CORS.
    # All optional in dev so legacy classifier tests don't need to set them.
    database_url: str
    supabase_jwt_secret: str
    gcs_bucket: str
    gcp_project: str
    cors_allowed_origins: tuple[str, ...]


def _parse_csv(value: str) -> tuple[str, ...]:
    return tuple(s.strip() for s in value.split(",") if s.strip())


def load_settings() -> Settings:
    return Settings(
        db_path=os.getenv("DOCQFLOW_DB_PATH", "data/docqflow.db"),
        pdf_dir=os.getenv("DOCQFLOW_PDF_DIR", "data/pdfs"),
        llm_base_url=os.getenv("LLM_BASE_URL", "http://host.docker.internal:11434/v1"),
        llm_api_key=os.getenv("LLM_API_KEY", "ollama"),
        llm_model=os.getenv("LLM_MODEL", "llama3.1:8b"),
        llm_timeout_seconds=int(os.getenv("LLM_TIMEOUT_SECONDS", "30")),
        extraction_prompt_version=int(os.getenv("EXTRACTION_PROMPT_VERSION", "1")),
        database_url=os.getenv("DATABASE_URL", ""),
        supabase_jwt_secret=os.getenv("SUPABASE_JWT_SECRET", ""),
        gcs_bucket=os.getenv("GCS_BUCKET", ""),
        gcp_project=os.getenv("GCP_PROJECT", ""),
        cors_allowed_origins=_parse_csv(
            os.getenv(
                "CORS_ALLOWED_ORIGINS",
                "https://docqflow.vercel.app,http://localhost:3000,http://localhost:5173",
            )
        ),
    )
