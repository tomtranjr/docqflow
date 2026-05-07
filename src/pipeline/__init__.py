"""DocQFlow pipeline package — Stages 4-6 (extract, validate, reason)."""

from __future__ import annotations

from src.pipeline.extract import NotAnAcroForm, read_acroform
from src.pipeline.gazetteer import Gazetteer
from src.pipeline.schemas import (
    ExtractedFields,
    Issue,
    IssueKind,
    LLMProfileInfo,
    PipelineResult,
    Severity,
    Source,
    Verdict,
)
from src.pipeline.validate import RULES, run_rules

__all__ = [
    "ExtractedFields",
    "Gazetteer",
    "Issue",
    "IssueKind",
    "LLMProfileInfo",
    "NotAnAcroForm",
    "PipelineResult",
    "RULES",
    "Severity",
    "Source",
    "Verdict",
    "read_acroform",
    "run_rules",
]
