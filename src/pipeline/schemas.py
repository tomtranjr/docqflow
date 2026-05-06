"""Pipeline data contract — shared types for Stages 4-6, API, and eval."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

Severity = Literal["minor", "major"]
Verdict = Literal["clean", "minor", "major"]
Source = Literal["rule", "llm"]

IssueKind = Literal[
    "missing_block_lot",
    "missing_description",
    "missing_street_number",
    "missing_form_checkbox",
    "block_lot_format",
    "license_digit_drop",
    "street_suffix_swap",
    "address_typo",
    "date_impossibility_swap",
    "address_block_lot_mismatch",
    "cost_scope_mismatch",
    "description_mismatch_bank_form_3_phrasing",
]

ExtractedFields = dict[str, str | bool | None]


class Issue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: IssueKind
    severity: Severity
    field: str
    value: str | None
    message: str
    source: Source
    confidence: float | None = None


class PipelineResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_id: UUID
    llm_profile: str
    verdict: Verdict
    extracted_fields: ExtractedFields
    issues: list[Issue]
    latency_ms: int


class LLMProfileInfo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    provider: str
    model: str
    reachable: bool
