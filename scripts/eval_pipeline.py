"""CLI: grade the Stages 4-6 pipeline against the labeled corpus.

Examples::

    # Smoke run (no LLM, fast, suitable for CI):
    uv run python scripts/eval_pipeline.py --profile cloud-fast --dry-run --limit 10

    # Full live evaluation (incurs LLM cost):
    uv run python scripts/eval_pipeline.py --profile cloud-fast --out _scratch/eval-report.json

The human-readable summary always goes to stdout. ``--out`` is for the
machine-readable JSON artifact. Status / heads-up messages go to stderr so
they don't pollute a piped summary.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    # Allow `uv run python scripts/eval_pipeline.py` to import the `src.*`
    # packages without installing the repo as a package.
    sys.path.insert(0, str(_REPO_ROOT))

from src.eval.metrics import render_markdown_summary  # noqa: E402
from src.eval.runner import evaluate_corpus, load_labels  # noqa: E402
from src.pipeline.gazetteer import Gazetteer  # noqa: E402

_DEFAULT_CORPUS = _REPO_ROOT / "data" / "permit-3-8"


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Grade the Stages 4-6 pipeline against the labeled corpus. "
            "Prints a human-readable summary to stdout; optionally writes a "
            "full JSON report to --out."
        )
    )
    parser.add_argument(
        "--profile",
        required=True,
        help="LLM profile registered in src.pipeline.llm_profiles (e.g. 'cloud-fast').",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Cap number of docs (sorted by filename — deterministic).",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Optional path to write the full JSON report.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help=(
            "Mock the LLM at the judge() boundary. Only deterministic Stages "
            "4-5 run. Use this for CI."
        ),
    )
    parser.add_argument(
        "--corpus-dir",
        type=Path,
        default=_DEFAULT_CORPUS,
        help="Directory of labeled PDFs (default: data/permit-3-8/).",
    )
    parser.add_argument(
        "--labels",
        type=Path,
        default=None,
        help="Path to labels.json (default: <corpus-dir>/labels.json).",
    )
    return parser.parse_args(argv)


async def _run(args: argparse.Namespace) -> dict:
    labels_path = args.labels or (args.corpus_dir / "labels.json")
    if not labels_path.exists():
        sys.stderr.write(f"error: labels file not found: {labels_path}\n")
        raise SystemExit(2)
    labels = load_labels(labels_path)

    if not args.dry_run:
        sys.stderr.write(
            "Note: live LLM evaluation will incur API cost (~$0.07 for the "
            "full 100-doc corpus on cloud-fast). Use --dry-run to skip the LLM.\n"
        )

    gazetteer = Gazetteer.load()

    return await evaluate_corpus(
        profile=args.profile,
        corpus_dir=args.corpus_dir,
        labels=labels,
        gazetteer=gazetteer,
        limit=args.limit,
        dry_run=args.dry_run,
    )


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.WARNING)
    args = _parse_args(argv)
    report = asyncio.run(_run(args))

    sys.stdout.write(render_markdown_summary(report))

    if args.out is not None:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(report, indent=2) + "\n")
        sys.stderr.write(f"wrote JSON report to {args.out}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
