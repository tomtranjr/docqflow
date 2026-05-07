"""Stage 6: LLM-judged reasoning rules.

Two judges call the configured LLM profile via `judge()` and convert the
structured verdict into `Issue` records:

* `judge_cost_scope` — ``cost_scope_mismatch``: estimated cost vs scope of work
* `judge_description` — ``description_mismatch_bank_form_3_phrasing``:
  description text vs Form 3 / Form 8 selection

`run_reasoning` runs both concurrently and never raises into the orchestrator:
exceptions become `None` results (skipped) and ``LLMTimeout`` becomes a
`major` Issue with ``confidence=None`` so the verdict rollup can route the
document to manual review.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from src.pipeline.llm_profiles import LLMSchemaError, LLMTimeout, judge
from src.pipeline.schemas import ExtractedFields, Issue, IssueKind

log = logging.getLogger(__name__)

DEFAULT_CONFIDENCE_THRESHOLD = 0.6

COST_FIELD = "2A ESTIMATED COST OF JOB"
PRESENT_USE_FIELD = "7A PRESENT USE"
FORM_3_CHECKBOX = "Check Box8"
FORM_8_CHECKBOX = "Check Box9"
DESCRIPTION_FIELDS = (
    "16 DESCRIPTION",
    "16A DESCRIPTION",
    "16B DESCRIPTION",
    "16C DESCRIPTION",
    "16D DESCRIPTION",
)

PROMPT_COST_SCOPE_SYSTEM = (
    "You are a permit reviewer for the San Francisco Department of Building "
    "Inspection. Decide whether the estimated cost of the job is plausible "
    "for the described scope of work and present use of the property. "
    "Flag obvious mismatches (e.g. a $1 estimate for a multi-unit "
    "renovation, or a $500,000 estimate for replacing a single window). "
    "Output JSON matching the JudgeResponse schema. Set verdict='flag' only "
    "when the mismatch is clear; use confidence to express how certain you "
    "are (0.0-1.0)."
)

PROMPT_DESCRIPTION_SYSTEM = (
    "You are a permit reviewer for the San Francisco Department of Building "
    "Inspection. Form 3 is for projects requiring review by other agencies "
    "(structural, planning, fire). Form 8 is over-the-counter issuance for "
    "minor work that needs no other-agency review. Decide whether the "
    "description text matches the scope expected by the selected form. "
    "Flag descriptions that read like Form-8 minor work but are filed on "
    "Form 3 (or vice versa). Output JSON matching the JudgeResponse schema. "
    "Set verdict='flag' only when the mismatch is clear; use confidence to "
    "express how certain you are (0.0-1.0)."
)


class JudgeResponse(BaseModel):
    """Structured verdict returned by every Stage 6 LLM judge."""

    model_config = ConfigDict(extra="forbid")

    verdict: Literal["ok", "flag"]
    confidence: float = Field(ge=0.0, le=1.0)
    message: str


def _str(value: object) -> str | None:
    if isinstance(value, bool) or value is None:
        return None
    s = str(value).strip()
    return s or None


def _description_text(fields: ExtractedFields) -> str:
    parts = [_str(fields.get(name)) for name in DESCRIPTION_FIELDS]
    return " ".join(p for p in parts if p)


def _description_field_label(fields: ExtractedFields) -> str:
    """Return the first description field that holds a value, else the canonical name."""
    for name in DESCRIPTION_FIELDS:
        if _str(fields.get(name)):
            return name
    return DESCRIPTION_FIELDS[0]


def _selected_form(fields: ExtractedFields) -> str:
    form_3 = bool(fields.get(FORM_3_CHECKBOX))
    form_8 = bool(fields.get(FORM_8_CHECKBOX))
    if form_3 and not form_8:
        return "Form 3 (other agencies review required)"
    if form_8 and not form_3:
        return "Form 8 (over-the-counter issuance)"
    if form_3 and form_8:
        return "Both Form 3 and Form 8 selected (ambiguous)"
    return "Neither Form 3 nor Form 8 selected"


def _build_cost_scope_user_prompt(fields: ExtractedFields) -> str:
    cost = _str(fields.get(COST_FIELD)) or "(blank)"
    present_use = _str(fields.get(PRESENT_USE_FIELD)) or "(blank)"
    description = _description_text(fields) or "(blank)"
    return (
        f"Estimated cost of job: {cost}\n"
        f"Present use of property: {present_use}\n"
        f"Description of work: {description}\n"
    )


def _build_description_user_prompt(fields: ExtractedFields) -> str:
    description = _description_text(fields) or "(blank)"
    return (
        f"Selected form: {_selected_form(fields)}\nDescription of work: {description}\n"
    )


def _timeout_issue(kind: IssueKind, field: str, value: str | None) -> Issue:
    return Issue(
        kind=kind,
        severity="major",
        field=field,
        value=value,
        message="LLM timeout — manual review required",
        source="llm",
        confidence=None,
    )


async def _run_judge(
    *,
    kind: IssueKind,
    field: str,
    value: str | None,
    system: str,
    user: str,
    profile: str,
    threshold: float,
) -> Issue | None:
    try:
        verdict = await judge(profile, system=system, user=user, schema=JudgeResponse)
    except LLMTimeout:
        log.warning("stage-6 judge timed out: kind=%s profile=%s", kind, profile)
        return _timeout_issue(kind, field, value)
    except LLMSchemaError:
        log.warning(
            "stage-6 judge returned malformed payload: kind=%s profile=%s",
            kind,
            profile,
        )
        return None

    if not isinstance(verdict, JudgeResponse):
        log.warning("stage-6 judge returned unexpected schema type: %s", type(verdict))
        return None
    if verdict.verdict != "flag":
        return None
    if verdict.confidence < threshold:
        log.info(
            "stage-6 judge below confidence threshold: kind=%s confidence=%.2f",
            kind,
            verdict.confidence,
        )
        return None

    return Issue(
        kind=kind,
        severity="major",
        field=field,
        value=value,
        message=verdict.message,
        source="llm",
        confidence=verdict.confidence,
    )


async def judge_cost_scope(
    fields: ExtractedFields,
    profile: str,
    *,
    threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
) -> Issue | None:
    """Judge whether ``2A ESTIMATED COST OF JOB`` is plausible for the scope."""
    return await _run_judge(
        kind="cost_scope_mismatch",
        field=COST_FIELD,
        value=_str(fields.get(COST_FIELD)),
        system=PROMPT_COST_SCOPE_SYSTEM,
        user=_build_cost_scope_user_prompt(fields),
        profile=profile,
        threshold=threshold,
    )


async def judge_description(
    fields: ExtractedFields,
    profile: str,
    *,
    threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
) -> Issue | None:
    """Judge whether the description matches the selected form's expected scope."""
    return await _run_judge(
        kind="description_mismatch_bank_form_3_phrasing",
        field=_description_field_label(fields),
        value=_description_text(fields) or None,
        system=PROMPT_DESCRIPTION_SYSTEM,
        user=_build_description_user_prompt(fields),
        profile=profile,
        threshold=threshold,
    )


async def run_reasoning(
    fields: ExtractedFields,
    profile: str,
    *,
    threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
) -> list[Issue]:
    """Run all Stage 6 judges concurrently. Always returns a list; never raises.

    Each judge is wrapped so a crash in one cannot affect the other. Unexpected
    exceptions are logged and skipped; ``LLMTimeout`` is converted to an Issue
    inside `_run_judge`.
    """
    results = await asyncio.gather(
        judge_cost_scope(fields, profile, threshold=threshold),
        judge_description(fields, profile, threshold=threshold),
        return_exceptions=True,
    )

    issues: list[Issue] = []
    for result in results:
        if isinstance(result, BaseException):
            log.error("stage-6 judge raised unexpectedly: %r", result)
            continue
        if result is not None:
            issues.append(result)
    return issues
