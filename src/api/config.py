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


def load_settings() -> Settings:
    return Settings(
        db_path=os.getenv("DOCQFLOW_DB_PATH", "data/docqflow.db"),
        pdf_dir=os.getenv("DOCQFLOW_PDF_DIR", "data/pdfs"),
        llm_base_url=os.getenv("LLM_BASE_URL", "http://host.docker.internal:11434/v1"),
        llm_api_key=os.getenv("LLM_API_KEY", "ollama"),
        llm_model=os.getenv("LLM_MODEL", "llama3.1:8b"),
        llm_timeout_seconds=int(os.getenv("LLM_TIMEOUT_SECONDS", "30")),
        extraction_prompt_version=int(os.getenv("EXTRACTION_PROMPT_VERSION", "1")),
    )
