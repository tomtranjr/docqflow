"""Contract tests for pipeline schemas.

Locks the output contract used by Stages 4-6, API-1, and the eval harness.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import get_args
from uuid import uuid4

import pytest
from pydantic import ValidationError

from src.pipeline import (
    Issue,
    IssueKind,
    LLMProfileInfo,
    PipelineResult,
)

LABELS_PATH = Path(__file__).resolve().parent / "fixtures" / "labels.json"


def _sample_issue() -> Issue:
    return Issue(
        kind="block_lot_format",
        severity="minor",
        field="1 BLOCK & LOT",
        value="6509062",
        message="block/lot missing slash",
        source="rule",
        confidence=None,
    )


def _sample_result() -> PipelineResult:
    return PipelineResult(
        document_id=uuid4(),
        llm_profile="cloud-fast",
        verdict="minor",
        extracted_fields={
            "1 BLOCK & LOT": "6509062",
            "Check Box8": True,
            "9A NO OF DWELLING UNITS": None,
        },
        issues=[_sample_issue()],
        latency_ms=1234,
    )


def _sample_profile() -> LLMProfileInfo:
    return LLMProfileInfo(
        name="cloud-fast", provider="openai", model="gpt-4o-mini", reachable=True
    )


class TestRoundTrip:
    def test_issue_round_trip(self):
        original = _sample_issue()
        rebuilt = Issue.model_validate_json(original.model_dump_json())
        assert rebuilt == original

    def test_pipeline_result_round_trip(self):
        original = _sample_result()
        rebuilt = PipelineResult.model_validate_json(original.model_dump_json())
        assert rebuilt == original

    def test_llm_profile_info_round_trip(self):
        original = _sample_profile()
        rebuilt = LLMProfileInfo.model_validate_json(original.model_dump_json())
        assert rebuilt == original


class TestNegativeValidation:
    def test_unknown_issue_kind_rejected(self):
        with pytest.raises(ValidationError):
            Issue(
                kind="not_a_real_kind",  # type: ignore[arg-type]
                severity="minor",
                field="1 BLOCK & LOT",
                value=None,
                message="x",
                source="rule",
            )

    def test_unknown_severity_rejected(self):
        with pytest.raises(ValidationError):
            Issue(
                kind="block_lot_format",
                severity="critical",  # type: ignore[arg-type]
                field="1 BLOCK & LOT",
                value=None,
                message="x",
                source="rule",
            )

    def test_unknown_source_rejected(self):
        with pytest.raises(ValidationError):
            Issue(
                kind="block_lot_format",
                severity="minor",
                field="1 BLOCK & LOT",
                value=None,
                message="x",
                source="human",  # type: ignore[arg-type]
            )

    def test_unknown_verdict_rejected(self):
        with pytest.raises(ValidationError):
            PipelineResult(
                document_id=uuid4(),
                llm_profile="cloud-fast",
                verdict="catastrophic",  # type: ignore[arg-type]
                extracted_fields={},
                issues=[],
                latency_ms=0,
            )

    def test_extra_fields_forbidden_on_issue(self):
        with pytest.raises(ValidationError):
            Issue.model_validate(
                {
                    "kind": "block_lot_format",
                    "severity": "minor",
                    "field": "1 BLOCK & LOT",
                    "value": None,
                    "message": "x",
                    "source": "rule",
                    "unexpected": "boom",
                }
            )

    def test_extra_fields_forbidden_on_pipeline_result(self):
        with pytest.raises(ValidationError):
            PipelineResult.model_validate(
                {
                    "document_id": str(uuid4()),
                    "llm_profile": "cloud-fast",
                    "verdict": "clean",
                    "extracted_fields": {},
                    "issues": [],
                    "latency_ms": 0,
                    "unexpected": "boom",
                }
            )


class TestLabelCoverage:
    """Hard-fail guard: every kind in the fixture must be a declared IssueKind.

    The fixture at tests/pipeline/fixtures/labels.json is the canonical
    snapshot of every mutation kind the pipeline is expected to emit. If
    someone adds a kind to the fixture without adding it to IssueKind
    (or vice versa), this test fires.

    The real labels file at data/permit-3-8/ is gitignored, so this fixture
    is what runs in CI on a clean checkout.
    """

    def test_every_label_kind_is_a_declared_issue_kind(self):
        declared = set(get_args(IssueKind))
        labels = json.loads(LABELS_PATH.read_text())
        seen: set[str] = set()
        for doc in labels.values():
            for mutation in doc.get("mutations", []):
                seen.add(mutation["kind"])
        missing = seen - declared
        assert not missing, (
            f"fixture labels.json contains mutation kinds not declared in IssueKind: {sorted(missing)}. "
            "Add them to src/pipeline/schemas.py::IssueKind."
        )
