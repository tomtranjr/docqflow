"""End-to-end pipeline orchestration: extract → validate → reason → roll up.

`run_pipeline` is the single callable that runs Stages 4-6 in order, gathers
all issues, derives a verdict, and returns a `PipelineResult`. It deliberately
does **not** touch GCS or the database — those concerns live in the API layer
so this function stays unit-testable and reusable from the eval harness.
"""

from __future__ import annotations

import logging
import time
from uuid import uuid4

from src.pipeline.extract import read_acroform
from src.pipeline.gazetteer import Gazetteer
from src.pipeline.reason import run_reasoning
from src.pipeline.schemas import Issue, PipelineResult, Verdict
from src.pipeline.validate import run_rules

log = logging.getLogger(__name__)


def _rollup_verdict(issues: list[Issue]) -> Verdict:
    if any(i.severity == "major" for i in issues):
        return "major"
    if any(i.severity == "minor" for i in issues):
        return "minor"
    return "clean"


async def run_pipeline(
    pdf_bytes: bytes,
    profile: str,
    *,
    gazetteer: Gazetteer,
) -> PipelineResult:
    """Run Stages 4-6 end-to-end and produce a `PipelineResult`.

    Stage 4 errors (`NotAnAcroForm`) propagate so the API layer can return 422.
    Stage 6 errors degrade inside `run_reasoning` (timeout → Issue, schema
    error → skipped); this function never raises on LLM failures.
    """
    start = time.monotonic()

    fields = read_acroform(pdf_bytes)
    rule_issues = run_rules(fields, gazetteer)
    llm_issues = await run_reasoning(fields, profile)
    issues = rule_issues + llm_issues

    latency_ms = int((time.monotonic() - start) * 1000)
    return PipelineResult(
        document_id=uuid4(),
        llm_profile=profile,
        verdict=_rollup_verdict(issues),
        extracted_fields=fields,
        issues=issues,
        latency_ms=latency_ms,
    )
