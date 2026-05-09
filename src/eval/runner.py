"""Eval-harness runner — load corpus, run pipeline per doc, build report.

Two collaboration seams with the rest of the pipeline:

1. ``patch_judge_dry_run`` swaps ``src.pipeline.reason.judge`` for a stub that
   always returns a benign ``ok`` verdict, so ``--dry-run`` runs Stages 4-5
   only and never makes a real LLM call. Patches the *imported* name (not
   ``llm_profiles.judge``) because ``reason.py`` does ``from
   src.pipeline.llm_profiles import judge``, binding the name into its own
   module namespace.

2. ``capture_litellm_cost`` wraps ``litellm.acompletion`` for the duration of
   a live run and accumulates ``response._hidden_params['response_cost']``
   when LiteLLM exposes it. Cost reporting stays best-effort — if LiteLLM
   doesn't surface cost on a particular call, we mark the run as
   not-fully-computable rather than fail.
"""

from __future__ import annotations

import contextlib
import json
import logging
from collections import Counter
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from src.eval.metrics import (
    compute_kind_metrics,
    compute_verdict_confusion,
    percentiles,
)
from src.pipeline import llm_profiles as llm_profiles_mod
from src.pipeline import reason as reason_mod
from src.pipeline.gazetteer import Gazetteer
from src.pipeline.orchestrator import run_pipeline
from src.pipeline.reason import JudgeResponse

log = logging.getLogger(__name__)


@contextlib.contextmanager
def patch_judge_dry_run() -> Iterator[None]:
    """Replace ``reason.judge`` with a stub returning a benign ``ok`` verdict.

    Use this whenever the eval harness must not call a real LLM (CI smoke
    tests, dry-run mode). ``run_reasoning`` will still execute, but every
    Stage 6 judge will return ``None`` (no flag), so only Stage 4 + Stage 5
    issues feed into the verdict rollup.
    """

    async def fake_judge(
        profile_name: str,
        *,
        system: str,
        user: str,
        schema: type,
    ) -> JudgeResponse:
        if schema is not JudgeResponse:
            raise AssertionError(
                f"dry-run stub only knows JudgeResponse; got {schema!r}"
            )
        return JudgeResponse(verdict="ok", confidence=1.0, message="dry-run")

    original = reason_mod.judge
    reason_mod.judge = fake_judge  # type: ignore[assignment]
    try:
        yield
    finally:
        reason_mod.judge = original  # type: ignore[assignment]


@contextlib.contextmanager
def capture_litellm_cost() -> Iterator[dict[str, Any]]:
    """Wrap ``litellm.acompletion`` and tally per-call cost into the yielded dict.

    The dict has three keys:

    * ``total`` — running USD total summed from ``response._hidden_params['response_cost']``.
    * ``calls`` — number of completions that surfaced a non-None cost.
    * ``computable`` — True iff every observed call yielded a numeric cost. The
      first call without a usable cost flips this to False; the runner uses it
      to decide whether to report ``total_cost_usd`` or ``None``.
    """
    state: dict[str, Any] = {"total": 0.0, "calls": 0, "computable": True}
    original = llm_profiles_mod.litellm.acompletion

    async def wrapped(*args: Any, **kwargs: Any) -> Any:
        response = await original(*args, **kwargs)
        try:
            hidden = getattr(response, "_hidden_params", None) or {}
            cost = hidden.get("response_cost") if isinstance(hidden, dict) else None
            if cost is None:
                state["computable"] = False
            else:
                state["total"] += float(cost)
                state["calls"] += 1
        except Exception:  # pragma: no cover — defensive
            log.warning("could not extract LiteLLM cost from response", exc_info=True)
            state["computable"] = False
        return response

    llm_profiles_mod.litellm.acompletion = wrapped
    try:
        yield state
    finally:
        llm_profiles_mod.litellm.acompletion = original


def load_labels(labels_path: Path) -> dict[str, dict]:
    """Read ``labels.json`` from disk."""
    with labels_path.open() as f:
        return json.load(f)


def _flavor_to_verdict(flavor: str) -> str:
    if flavor == "correct":
        return "clean"
    if flavor in {"minor", "major"}:
        return flavor
    raise ValueError(f"unknown flavor: {flavor!r}")


async def evaluate_corpus(
    *,
    profile: str,
    corpus_dir: Path,
    labels: dict[str, dict],
    gazetteer: Gazetteer,
    limit: int | None = None,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Run the pipeline on every labeled doc and return a report dict.

    Iteration order is filename-sorted so ``--limit`` is deterministic. Missing
    PDFs are recorded under ``skipped`` rather than failing the run — useful
    when the gitignored corpus is only partially synced. The returned dict is
    JSON-serializable as-is.
    """
    items = sorted(labels.items(), key=lambda kv: kv[0])
    if limit is not None:
        items = items[:limit]

    per_doc_pairs: list[tuple[Counter[str], Counter[str]]] = []
    per_doc_verdicts: list[tuple[str, str]] = []
    latencies_ms: list[int] = []
    skipped: list[str] = []

    cost_state: dict[str, Any] | None = None

    with contextlib.ExitStack() as stack:
        if dry_run:
            stack.enter_context(patch_judge_dry_run())
        else:
            cost_state = stack.enter_context(capture_litellm_cost())

        for filename, label in items:
            pdf_path = corpus_dir / filename
            if not pdf_path.exists():
                log.warning("skipping missing PDF: %s", pdf_path)
                skipped.append(filename)
                continue

            result = await run_pipeline(
                pdf_path.read_bytes(),
                profile=profile,
                gazetteer=gazetteer,
            )

            pred_kinds: Counter[str] = Counter(issue.kind for issue in result.issues)
            gt_kinds: Counter[str] = Counter(m["kind"] for m in label["mutations"])
            per_doc_pairs.append((pred_kinds, gt_kinds))
            per_doc_verdicts.append(
                (_flavor_to_verdict(label["flavor"]), result.verdict)
            )
            latencies_ms.append(result.latency_ms)

    per_kind = {
        kind: m.to_dict() for kind, m in compute_kind_metrics(per_doc_pairs).items()
    }
    confusion = compute_verdict_confusion(per_doc_verdicts)
    latency = percentiles(latencies_ms)

    if dry_run:
        total_cost: float | None = None
    elif (
        cost_state is not None and cost_state["computable"] and cost_state["calls"] > 0
    ):
        total_cost = round(cost_state["total"], 6)
    else:
        total_cost = None

    return {
        "profile": profile,
        "doc_count": len(per_doc_verdicts),
        "dry_run": dry_run,
        "per_kind": per_kind,
        "verdict_confusion": confusion,
        "latency_ms": latency,
        "total_cost_usd": total_cost,
        "skipped": skipped,
        "generated_at": datetime.now(UTC).isoformat(),
    }
