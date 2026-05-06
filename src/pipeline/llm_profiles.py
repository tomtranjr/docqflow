"""LLM profile registry — single seam for routing reasoning calls through LiteLLM.

One entry today (`cloud-fast` → OpenAI gpt-4o-mini), but the dict-of-Profile shape
is preserved so additional providers can be plugged in by registry edit alone.
"""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass

import litellm
from pydantic import BaseModel, ValidationError

from src.pipeline.schemas import LLMProfileInfo

logger = logging.getLogger(__name__)

JUDGE_TIMEOUT_SECONDS = 15.0


class LLMTimeout(Exception):
    """Raised when a `judge()` call exceeds JUDGE_TIMEOUT_SECONDS.

    Stage 6 catches this to record a partial verdict rather than failing the run.
    """


class LLMSchemaError(Exception):
    """Raised when an LLM response cannot be parsed into the requested schema."""


@dataclass(frozen=True)
class Profile:
    name: str
    provider: str
    model: str

    @property
    def litellm_model(self) -> str:
        return f"{self.provider}/{self.model}"


_REACHABILITY_ENV = {
    "openai": "OPENAI_API_KEY",
}


def _build_registry() -> dict[str, Profile]:
    return {
        "cloud-fast": Profile(
            name="cloud-fast",
            provider="openai",
            model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
        ),
    }


REGISTRY: dict[str, Profile] = _build_registry()


def _is_reachable(profile: Profile) -> bool:
    env_var = _REACHABILITY_ENV.get(profile.provider)
    return bool(env_var and os.environ.get(env_var))


def available_profiles() -> list[LLMProfileInfo]:
    """Return current registry entries with freshly-computed reachability."""
    return [
        LLMProfileInfo(
            name=p.name,
            provider=p.provider,
            model=p.model,
            reachable=_is_reachable(p),
        )
        for p in REGISTRY.values()
    ]


def _json_schema_payload(schema: type[BaseModel]) -> dict:
    return {
        "type": "json_schema",
        "json_schema": {
            "name": schema.__name__,
            "schema": schema.model_json_schema(),
            "strict": True,
        },
    }


async def judge(
    profile_name: str,
    system: str,
    user: str,
    schema: type[BaseModel],
) -> BaseModel:
    """Call the named LLM profile and return a validated `schema` instance.

    Raises:
        KeyError: profile_name is not registered.
        LLMTimeout: call exceeded JUDGE_TIMEOUT_SECONDS.
        LLMSchemaError: response could not be parsed/validated.
    """
    profile = REGISTRY[profile_name]
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
    try:
        response = await asyncio.wait_for(
            litellm.acompletion(
                model=profile.litellm_model,
                messages=messages,
                response_format=_json_schema_payload(schema),
            ),
            timeout=JUDGE_TIMEOUT_SECONDS,
        )
    except TimeoutError as exc:
        raise LLMTimeout(
            f"profile={profile_name} exceeded {JUDGE_TIMEOUT_SECONDS}s"
        ) from exc

    try:
        content = response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMSchemaError(f"malformed completion response: {exc}") from exc

    try:
        return schema.model_validate_json(content)
    except ValidationError as exc:
        raise LLMSchemaError(f"response failed schema validation: {exc}") from exc
