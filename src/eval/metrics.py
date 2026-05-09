"""Pure metric arithmetic for the pipeline eval harness.

No I/O, no pipeline calls — every function takes already-collected per-doc
results and returns aggregated metrics. Kept separate from ``runner.py`` so
the math is unit-testable without spinning up PDFs or the LLM seam.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass
from typing import get_args

from src.pipeline.schemas import IssueKind, Verdict

KIND_VALUES: tuple[str, ...] = get_args(IssueKind)
VERDICT_VALUES: tuple[str, ...] = get_args(Verdict)


@dataclass(frozen=True)
class KindMetrics:
    """Per-kind precision / recall / F1 with raw TP/FP/FN counts."""

    tp: int
    fp: int
    fn: int
    n: int  # total ground-truth occurrences across the corpus
    precision: float
    recall: float
    f1: float

    def to_dict(self) -> dict[str, float | int]:
        return {
            "precision": round(self.precision, 4),
            "recall": round(self.recall, 4),
            "f1": round(self.f1, 4),
            "tp": self.tp,
            "fp": self.fp,
            "fn": self.fn,
            "n": self.n,
        }


def _safe_div(num: float, den: float) -> float:
    return num / den if den else 0.0


def compute_kind_metrics(
    per_doc_pairs: Iterable[tuple[Counter[str], Counter[str]]],
) -> dict[str, KindMetrics]:
    """Aggregate per-doc (predicted, ground-truth) kind counters into per-kind metrics.

    For each kind on each doc::

        tp_doc = min(pred_count, gt_count)
        fp_doc = max(pred_count - gt_count, 0)
        fn_doc = max(gt_count - pred_count, 0)

    Sums are taken across docs. Precision/recall fall back to 0.0 when their
    denominators are 0 (no predictions / no ground truth respectively); F1 is
    the harmonic mean and is also 0.0 when either component is 0.
    """
    tp: Counter[str] = Counter()
    fp: Counter[str] = Counter()
    fn: Counter[str] = Counter()
    n: Counter[str] = Counter()

    for pred, gt in per_doc_pairs:
        for k in set(pred) | set(gt):
            p = pred.get(k, 0)
            g = gt.get(k, 0)
            tp[k] += min(p, g)
            fp[k] += max(p - g, 0)
            fn[k] += max(g - p, 0)
            n[k] += g

    out: dict[str, KindMetrics] = {}
    for k in set(tp) | set(fp) | set(fn) | set(n):
        precision = _safe_div(tp[k], tp[k] + fp[k])
        recall = _safe_div(tp[k], tp[k] + fn[k])
        f1 = _safe_div(2 * precision * recall, precision + recall)
        out[k] = KindMetrics(
            tp=tp[k],
            fp=fp[k],
            fn=fn[k],
            n=n[k],
            precision=precision,
            recall=recall,
            f1=f1,
        )
    return out


def compute_verdict_confusion(
    per_doc_verdicts: Iterable[tuple[str, str]],
) -> dict[str, dict[str, int]]:
    """Build the actual×predicted verdict confusion matrix.

    Outer key is ``actual_<verdict>``; inner key is the predicted verdict.
    Every cell exists (zero-filled) so downstream rendering doesn't have to
    guard against missing buckets.
    """
    matrix: dict[str, dict[str, int]] = {
        f"actual_{a}": dict.fromkeys(VERDICT_VALUES, 0) for a in VERDICT_VALUES
    }
    for actual, predicted in per_doc_verdicts:
        if actual not in VERDICT_VALUES:
            raise ValueError(f"unknown actual verdict: {actual!r}")
        if predicted not in VERDICT_VALUES:
            raise ValueError(f"unknown predicted verdict: {predicted!r}")
        matrix[f"actual_{actual}"][predicted] += 1
    return matrix


def percentiles(values: list[int]) -> dict[str, int]:
    """Return p50/p95/p99/max from a list of integer latencies (ms).

    Uses nearest-rank percentile so the result is always one of the input
    values — no interpolation. For an empty list, returns all zeros so JSON
    serialization stays simple.
    """
    if not values:
        return {"p50": 0, "p95": 0, "p99": 0, "max": 0}
    ordered = sorted(values)
    last = len(ordered) - 1

    def _rank(p: float) -> int:
        return ordered[round(p / 100 * last)]

    return {
        "p50": _rank(50),
        "p95": _rank(95),
        "p99": _rank(99),
        "max": ordered[-1],
    }


def render_markdown_summary(report: dict) -> str:
    """Render the JSON-shaped ``report`` into the human-readable summary.

    Matches the sketch in the eval-harness bead — a verdict confusion matrix,
    per-kind P/R/F1 lines (one per kind that has either predictions or ground
    truth), latency percentiles, and an LLM-cost line. Iterates ``KIND_VALUES``
    in declaration order so the output is deterministic even when ``per_kind``
    is a regular dict.
    """
    profile = report["profile"]
    n_docs = report["doc_count"]
    suffix = " (dry-run)" if report.get("dry_run") else ""
    lines: list[str] = [
        f"=== DocQFlow Eval — profile={profile} — {n_docs} docs{suffix} ===",
        "",
        "Verdict confusion matrix:",
        f"{'':<14}{'pred=clean':>12}{'pred=minor':>12}{'pred=major':>12}",
    ]
    for actual in VERDICT_VALUES:
        row = report["verdict_confusion"][f"actual_{actual}"]
        lines.append(
            f"actual={actual:<8}{row['clean']:>12}{row['minor']:>12}{row['major']:>12}"
        )
    lines.append("")
    lines.append("Per-kind P/R/F1:")

    per_kind: dict[str, dict] = report["per_kind"]
    for kind in KIND_VALUES:
        m = per_kind.get(kind)
        if m is None:
            continue
        lines.append(
            f"  {kind:<44} P={m['precision']:.2f} R={m['recall']:.2f} "
            f"F1={m['f1']:.2f} (n={m['n']})"
        )
    lines.append("")

    lat = report["latency_ms"]
    lines.append(
        f"Latency: p50={lat['p50'] / 1000:.1f}s  p95={lat['p95'] / 1000:.1f}s  "
        f"p99={lat['p99'] / 1000:.1f}s  max={lat['max'] / 1000:.1f}s"
    )

    cost = report.get("total_cost_usd")
    if cost is None:
        lines.append("Total LLM cost: (unavailable)")
    else:
        lines.append(f"Total LLM cost: ${cost:.4f}")

    return "\n".join(lines) + "\n"
