"""Tests for the LLM profile registry, judge() wrapper, and /llm/profiles route.

All `litellm.acompletion` calls are mocked — no live LLM traffic.
"""

from __future__ import annotations

import asyncio

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel, ConfigDict

from src.api.routes_pipeline import router as pipeline_router
from src.pipeline import llm_profiles
from src.pipeline.llm_profiles import (
    JUDGE_TIMEOUT_SECONDS,
    REGISTRY,
    LLMSchemaError,
    LLMTimeout,
    available_profiles,
    judge,
)


class _Verdict(BaseModel):
    model_config = ConfigDict(extra="forbid")

    severity: str
    rationale: str


def _completion(content: str) -> dict:
    return {"choices": [{"message": {"content": content}}]}


def test_registry_has_cloud_fast_default():
    assert "cloud-fast" in REGISTRY
    profile = REGISTRY["cloud-fast"]
    assert profile.provider == "openai"
    assert profile.litellm_model == f"openai/{profile.model}"


def test_available_profiles_reachable_when_key_set(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    profiles = available_profiles()
    assert any(p.name == "cloud-fast" and p.reachable for p in profiles)


def test_available_profiles_unreachable_when_key_missing(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    profiles = available_profiles()
    cloud_fast = next(p for p in profiles if p.name == "cloud-fast")
    assert cloud_fast.reachable is False


@pytest.mark.asyncio
async def test_judge_returns_validated_schema(monkeypatch):
    captured: dict = {}

    async def fake_acompletion(**kwargs):
        captured.update(kwargs)
        return _completion('{"severity":"minor","rationale":"ok"}')

    monkeypatch.setattr(llm_profiles.litellm, "acompletion", fake_acompletion)

    result = await judge(
        "cloud-fast",
        system="you are a judge",
        user="rate this",
        schema=_Verdict,
    )

    assert isinstance(result, _Verdict)
    assert result.severity == "minor"
    assert captured["model"].startswith("openai/")
    response_format = captured["response_format"]
    assert response_format["type"] == "json_schema"
    assert response_format["json_schema"]["name"] == "_Verdict"
    assert "schema" in response_format["json_schema"]


@pytest.mark.asyncio
async def test_judge_unknown_profile_raises(monkeypatch):
    async def fake_acompletion(**kwargs):  # pragma: no cover — should not run
        return _completion("{}")

    monkeypatch.setattr(llm_profiles.litellm, "acompletion", fake_acompletion)

    with pytest.raises(KeyError):
        await judge("does-not-exist", system="s", user="u", schema=_Verdict)


@pytest.mark.asyncio
async def test_judge_raises_llm_timeout(monkeypatch):
    async def hang(**kwargs):
        await asyncio.sleep(JUDGE_TIMEOUT_SECONDS + 1)
        return _completion("{}")

    async def fake_wait_for(coro, timeout):
        coro.close()
        raise TimeoutError

    monkeypatch.setattr(llm_profiles.litellm, "acompletion", hang)
    monkeypatch.setattr(llm_profiles.asyncio, "wait_for", fake_wait_for)

    with pytest.raises(LLMTimeout):
        await judge("cloud-fast", system="s", user="u", schema=_Verdict)


@pytest.mark.asyncio
async def test_judge_raises_schema_error_on_invalid_json(monkeypatch):
    async def fake_acompletion(**kwargs):
        return _completion("not json")

    monkeypatch.setattr(llm_profiles.litellm, "acompletion", fake_acompletion)

    with pytest.raises(LLMSchemaError):
        await judge("cloud-fast", system="s", user="u", schema=_Verdict)


@pytest.mark.asyncio
async def test_judge_raises_schema_error_when_fields_missing(monkeypatch):
    async def fake_acompletion(**kwargs):
        return _completion('{"severity":"minor"}')  # missing rationale

    monkeypatch.setattr(llm_profiles.litellm, "acompletion", fake_acompletion)

    with pytest.raises(LLMSchemaError):
        await judge("cloud-fast", system="s", user="u", schema=_Verdict)


def test_get_llm_profiles_route(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    app = FastAPI()
    app.include_router(pipeline_router)
    client = TestClient(app)

    response = client.get("/llm/profiles")

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert any(
        p["name"] == "cloud-fast" and p["provider"] == "openai" and p["reachable"]
        for p in payload
    )
