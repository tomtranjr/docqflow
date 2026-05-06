"""Pipeline-facing API routes (Stages 4-6 era).

Currently exposes LLM profile discovery for the frontend; will grow with
`POST /documents/process` (API-1) and per-run lookups.
"""

from __future__ import annotations

from fastapi import APIRouter

from src.pipeline.llm_profiles import available_profiles
from src.pipeline.schemas import LLMProfileInfo

router = APIRouter()


@router.get("/llm/profiles", response_model=list[LLMProfileInfo])
def list_llm_profiles() -> list[LLMProfileInfo]:
    """Return all registered LLM profiles with current reachability."""
    return available_profiles()
