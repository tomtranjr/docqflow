"""Unit tests for the centralized Settings module."""

from __future__ import annotations

import dataclasses
import os
from unittest.mock import patch

import pytest

from src.api.config import load_settings


def test_load_settings_uses_defaults_when_env_unset():
    with patch.dict(os.environ, {}, clear=True):
        s = load_settings()
    assert s.db_path == "data/docqflow.db"
    assert s.pdf_dir == "data/pdfs"
    assert s.llm_base_url == "http://host.docker.internal:11434/v1"
    assert s.llm_api_key == "ollama"
    assert s.llm_model == "llama3.1:8b"
    assert s.llm_timeout_seconds == 30
    assert s.extraction_prompt_version == 1


def test_load_settings_reads_overrides_from_env():
    overrides = {
        "DOCQFLOW_DB_PATH": "/tmp/test.db",
        "DOCQFLOW_PDF_DIR": "/tmp/pdfs",
        "LLM_BASE_URL": "http://custom:9000/v1",
        "LLM_API_KEY": "secret",
        "LLM_MODEL": "qwen2.5:7b",
        "LLM_TIMEOUT_SECONDS": "60",
        "EXTRACTION_PROMPT_VERSION": "3",
    }
    with patch.dict(os.environ, overrides, clear=True):
        s = load_settings()
    assert s.db_path == "/tmp/test.db"
    assert s.pdf_dir == "/tmp/pdfs"
    assert s.llm_base_url == "http://custom:9000/v1"
    assert s.llm_api_key == "secret"
    assert s.llm_model == "qwen2.5:7b"
    assert s.llm_timeout_seconds == 60
    assert s.extraction_prompt_version == 3


def test_settings_is_frozen():
    s = load_settings()
    with pytest.raises(dataclasses.FrozenInstanceError):
        s.db_path = "/elsewhere"  # type: ignore[misc]
