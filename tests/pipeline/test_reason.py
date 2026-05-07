"""Tests for Stage 6 LLM reasoning judges.

`judge()` is mocked at the boundary so no live LLM traffic occurs.
"""

from __future__ import annotations

from typing import Any

import pytest

from src.pipeline import reason as reason_mod
from src.pipeline.llm_profiles import LLMSchemaError, LLMTimeout
from src.pipeline.reason import (
    DEFAULT_CONFIDENCE_THRESHOLD,
    JudgeResponse,
    judge_cost_scope,
    judge_description,
    run_reasoning,
)


def _fields(**overrides: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "2A ESTIMATED COST OF JOB": "$120000",
        "7A PRESENT USE": "apartments",
        "16 DESCRIPTION": "renovate kitchen and add new partition wall",
        "Check Box8": False,
        "Check Box9": True,
    }
    base.update(overrides)
    return base


def _patch_judge(monkeypatch, response):
    """Replace `reason.judge` with a stub that returns / raises `response`.

    `response` is either a JudgeResponse, a callable returning one, or an
    Exception instance to raise.
    """

    async def fake_judge(profile, *, system, user, schema):
        assert schema is JudgeResponse
        value = response(system=system, user=user) if callable(response) else response
        if isinstance(value, BaseException):
            raise value
        return value

    monkeypatch.setattr(reason_mod, "judge", fake_judge)


@pytest.mark.asyncio
async def test_judge_cost_scope_clean_returns_none(monkeypatch):
    _patch_judge(
        monkeypatch,
        JudgeResponse(verdict="ok", confidence=0.9, message="plausible"),
    )
    assert await judge_cost_scope(_fields(), "cloud-fast") is None


@pytest.mark.asyncio
async def test_judge_cost_scope_flagged_emits_major_issue(monkeypatch):
    _patch_judge(
        monkeypatch,
        JudgeResponse(
            verdict="flag",
            confidence=0.92,
            message="$1 is implausible for a multi-unit kitchen renovation",
        ),
    )
    issue = await judge_cost_scope(
        _fields(**{"2A ESTIMATED COST OF JOB": "$1"}), "cloud-fast"
    )

    assert issue is not None
    assert issue.kind == "cost_scope_mismatch"
    assert issue.severity == "major"
    assert issue.source == "llm"
    assert issue.field == "2A ESTIMATED COST OF JOB"
    assert issue.value == "$1"
    assert issue.confidence == pytest.approx(0.92)
    assert "implausible" in issue.message


@pytest.mark.asyncio
async def test_judge_cost_scope_low_confidence_suppressed(monkeypatch):
    _patch_judge(
        monkeypatch,
        JudgeResponse(verdict="flag", confidence=0.3, message="maybe off"),
    )
    assert await judge_cost_scope(_fields(), "cloud-fast") is None


@pytest.mark.asyncio
async def test_judge_cost_scope_threshold_override(monkeypatch):
    _patch_judge(
        monkeypatch,
        JudgeResponse(verdict="flag", confidence=0.55, message="leaning flag"),
    )
    # Default threshold (0.6) suppresses; lowering to 0.5 lets it through.
    assert await judge_cost_scope(_fields(), "cloud-fast") is None
    issue = await judge_cost_scope(_fields(), "cloud-fast", threshold=0.5)
    assert issue is not None and issue.kind == "cost_scope_mismatch"


@pytest.mark.asyncio
async def test_judge_cost_scope_timeout_emits_partial_issue(monkeypatch):
    _patch_judge(monkeypatch, LLMTimeout("boom"))
    issue = await judge_cost_scope(_fields(), "cloud-fast")

    assert issue is not None
    assert issue.kind == "cost_scope_mismatch"
    assert issue.severity == "major"
    assert issue.source == "llm"
    assert issue.confidence is None
    assert "manual review" in issue.message.lower()


@pytest.mark.asyncio
async def test_judge_cost_scope_schema_error_skipped(monkeypatch):
    _patch_judge(monkeypatch, LLMSchemaError("bad json"))
    assert await judge_cost_scope(_fields(), "cloud-fast") is None


@pytest.mark.asyncio
async def test_cost_scope_prompt_includes_relevant_fields(monkeypatch):
    captured: dict[str, str] = {}

    def stub(*, system: str, user: str) -> JudgeResponse:
        captured["system"] = system
        captured["user"] = user
        return JudgeResponse(verdict="ok", confidence=0.9, message="ok")

    _patch_judge(monkeypatch, stub)
    await judge_cost_scope(_fields(), "cloud-fast")

    assert "permit reviewer" in captured["system"].lower()
    assert "$120000" in captured["user"]
    assert "apartments" in captured["user"]
    assert "renovate kitchen" in captured["user"]


@pytest.mark.asyncio
async def test_judge_description_clean_returns_none(monkeypatch):
    _patch_judge(
        monkeypatch,
        JudgeResponse(verdict="ok", confidence=0.85, message="matches form"),
    )
    assert await judge_description(_fields(), "cloud-fast") is None


@pytest.mark.asyncio
async def test_judge_description_flagged_emits_issue(monkeypatch):
    _patch_judge(
        monkeypatch,
        JudgeResponse(
            verdict="flag",
            confidence=0.78,
            message="reads like Form 8 minor work but filed on Form 3",
        ),
    )
    fields = _fields(**{"Check Box8": True, "Check Box9": False})
    issue = await judge_description(fields, "cloud-fast")

    assert issue is not None
    assert issue.kind == "description_mismatch_bank_form_3_phrasing"
    assert issue.severity == "major"
    assert issue.source == "llm"
    assert issue.field == "16 DESCRIPTION"
    assert issue.value == "renovate kitchen and add new partition wall"
    assert issue.confidence == pytest.approx(0.78)


@pytest.mark.asyncio
async def test_judge_description_low_confidence_suppressed(monkeypatch):
    _patch_judge(
        monkeypatch,
        JudgeResponse(verdict="flag", confidence=0.4, message="weak signal"),
    )
    assert await judge_description(_fields(), "cloud-fast") is None


@pytest.mark.asyncio
async def test_judge_description_timeout_emits_partial_issue(monkeypatch):
    _patch_judge(monkeypatch, LLMTimeout("slow"))
    issue = await judge_description(_fields(), "cloud-fast")

    assert issue is not None
    assert issue.kind == "description_mismatch_bank_form_3_phrasing"
    assert issue.confidence is None
    assert "manual review" in issue.message.lower()


@pytest.mark.asyncio
async def test_description_prompt_reflects_form_selection(monkeypatch):
    captured: dict[str, str] = {}

    def stub(*, system: str, user: str) -> JudgeResponse:
        captured["user"] = user
        return JudgeResponse(verdict="ok", confidence=0.9, message="ok")

    _patch_judge(monkeypatch, stub)
    await judge_description(
        _fields(**{"Check Box8": True, "Check Box9": False}), "cloud-fast"
    )
    assert "Form 3" in captured["user"]

    captured.clear()
    _patch_judge(monkeypatch, stub)
    await judge_description(
        _fields(**{"Check Box8": False, "Check Box9": True}), "cloud-fast"
    )
    assert "Form 8" in captured["user"]


@pytest.mark.asyncio
async def test_run_reasoning_returns_empty_when_both_clean(monkeypatch):
    _patch_judge(
        monkeypatch,
        JudgeResponse(verdict="ok", confidence=0.95, message="ok"),
    )
    assert await run_reasoning(_fields(), "cloud-fast") == []


@pytest.mark.asyncio
async def test_run_reasoning_collects_both_issues(monkeypatch):
    def stub(*, system: str, user: str) -> JudgeResponse:
        # Both prompts are flagged with high confidence.
        return JudgeResponse(
            verdict="flag",
            confidence=0.9,
            message=("cost scope" if "Estimated cost" in user else "description"),
        )

    _patch_judge(monkeypatch, stub)
    issues = await run_reasoning(_fields(), "cloud-fast")
    kinds = {i.kind for i in issues}
    assert kinds == {
        "cost_scope_mismatch",
        "description_mismatch_bank_form_3_phrasing",
    }


@pytest.mark.asyncio
async def test_run_reasoning_never_raises_on_unexpected_exception(monkeypatch):
    async def boom(profile, *, system, user, schema):
        raise RuntimeError("network on fire")

    monkeypatch.setattr(reason_mod, "judge", boom)
    # Must return an empty list, not raise.
    assert await run_reasoning(_fields(), "cloud-fast") == []


@pytest.mark.asyncio
async def test_run_reasoning_one_judge_timeout_other_clean(monkeypatch):
    call_log: list[str] = []

    async def fake_judge(profile, *, system, user, schema):
        if "Estimated cost" in user:
            call_log.append("cost")
            raise LLMTimeout("slow")
        call_log.append("description")
        return JudgeResponse(verdict="ok", confidence=0.9, message="ok")

    monkeypatch.setattr(reason_mod, "judge", fake_judge)
    issues = await run_reasoning(_fields(), "cloud-fast")

    assert len(issues) == 1
    assert issues[0].kind == "cost_scope_mismatch"
    assert issues[0].confidence is None
    assert set(call_log) == {"cost", "description"}


def test_default_threshold_is_six_tenths():
    assert DEFAULT_CONFIDENCE_THRESHOLD == 0.6
