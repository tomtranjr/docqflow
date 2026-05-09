"""Tests for the eval harness.

Two layers:

* **Metric arithmetic** is exercised in isolation against crafted Counter /
  verdict pairs — no PDFs, no pipeline calls. These prove the math (TP/FP/FN,
  P/R/F1, percentiles, confusion-matrix totals) is right.
* **End-to-end wiring** runs ``evaluate_corpus`` over a tiny synthetic-PDF
  corpus with ``--dry-run`` (LLM patched at the ``reason.judge`` boundary).
  This proves the runner loads labels, slices ``--limit``, joins predicted
  vs ground-truth issues, and produces a report whose top-level shape
  matches the bead's spec.
"""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

import fitz
import pytest

from src.eval.metrics import (
    KIND_VALUES,
    VERDICT_VALUES,
    compute_kind_metrics,
    compute_verdict_confusion,
    percentiles,
    render_markdown_summary,
)
from src.eval.runner import evaluate_corpus, load_labels
from src.pipeline import gazetteer as gazetteer_mod
from src.pipeline.gazetteer import Gazetteer

# ---------------------------------------------------------------------------
# Pure metric arithmetic
# ---------------------------------------------------------------------------


def test_compute_kind_metrics_perfect_prediction():
    pairs = [
        (Counter({"block_lot_format": 1}), Counter({"block_lot_format": 1})),
        (Counter({"block_lot_format": 1}), Counter({"block_lot_format": 1})),
    ]
    out = compute_kind_metrics(pairs)
    m = out["block_lot_format"]
    assert (m.tp, m.fp, m.fn, m.n) == (2, 0, 0, 2)
    assert m.precision == 1.0
    assert m.recall == 1.0
    assert m.f1 == 1.0


def test_compute_kind_metrics_mixed_tp_fp_fn():
    # Doc 1: predicts both kinds; ground truth has only block_lot_format
    #   → block_lot_format TP+1; cost_scope_mismatch FP+1
    # Doc 2: predicts nothing; ground truth has cost_scope_mismatch
    #   → cost_scope_mismatch FN+1
    # Doc 3: predicts cost_scope_mismatch; ground truth has cost_scope_mismatch
    #   → cost_scope_mismatch TP+1
    pairs = [
        (
            Counter({"block_lot_format": 1, "cost_scope_mismatch": 1}),
            Counter({"block_lot_format": 1}),
        ),
        (Counter(), Counter({"cost_scope_mismatch": 1})),
        (Counter({"cost_scope_mismatch": 1}), Counter({"cost_scope_mismatch": 1})),
    ]
    out = compute_kind_metrics(pairs)

    blf = out["block_lot_format"]
    assert (blf.tp, blf.fp, blf.fn, blf.n) == (1, 0, 0, 1)
    assert blf.precision == 1.0
    assert blf.recall == 1.0

    csm = out["cost_scope_mismatch"]
    assert (csm.tp, csm.fp, csm.fn, csm.n) == (1, 1, 1, 2)
    assert csm.precision == pytest.approx(0.5)
    assert csm.recall == pytest.approx(0.5)
    assert csm.f1 == pytest.approx(0.5)


def test_compute_kind_metrics_kind_only_in_predictions():
    pairs = [(Counter({"address_typo": 2}), Counter())]
    m = compute_kind_metrics(pairs)["address_typo"]
    assert (m.tp, m.fp, m.fn, m.n) == (0, 2, 0, 0)
    assert m.precision == 0.0
    assert m.recall == 0.0  # safe-div: no ground truth
    assert m.f1 == 0.0


def test_compute_kind_metrics_kind_only_in_ground_truth():
    pairs = [(Counter(), Counter({"address_typo": 2}))]
    m = compute_kind_metrics(pairs)["address_typo"]
    assert (m.tp, m.fp, m.fn, m.n) == (0, 0, 2, 2)
    assert m.precision == 0.0
    assert m.recall == 0.0
    assert m.f1 == 0.0


def test_compute_kind_metrics_multiple_occurrences_same_kind():
    # Predicted 3 of one kind; GT has 2. tp=2, fp=1, fn=0.
    pairs = [(Counter({"address_typo": 3}), Counter({"address_typo": 2}))]
    m = compute_kind_metrics(pairs)["address_typo"]
    assert (m.tp, m.fp, m.fn, m.n) == (2, 1, 0, 2)
    assert m.precision == pytest.approx(2 / 3)
    assert m.recall == 1.0
    assert m.f1 == pytest.approx(2 * (2 / 3) * 1.0 / ((2 / 3) + 1.0))


def test_compute_kind_metrics_empty_input():
    assert compute_kind_metrics([]) == {}


def test_compute_verdict_confusion_zero_filled_and_totals():
    pairs = [
        ("clean", "clean"),
        ("clean", "minor"),
        ("minor", "minor"),
        ("major", "major"),
        ("major", "minor"),
    ]
    cm = compute_verdict_confusion(pairs)

    # All 9 cells exist (zero-filled where no observations).
    for actual in VERDICT_VALUES:
        for predicted in VERDICT_VALUES:
            assert predicted in cm[f"actual_{actual}"]

    grand_total = sum(c for row in cm.values() for c in row.values())
    assert grand_total == len(pairs)
    assert sum(cm["actual_clean"].values()) == 2
    assert sum(cm["actual_minor"].values()) == 1
    assert sum(cm["actual_major"].values()) == 2

    assert cm["actual_clean"]["clean"] == 1
    assert cm["actual_clean"]["minor"] == 1
    assert cm["actual_major"]["minor"] == 1


def test_compute_verdict_confusion_rejects_unknown_verdicts():
    with pytest.raises(ValueError):
        compute_verdict_confusion([("bogus", "clean")])
    with pytest.raises(ValueError):
        compute_verdict_confusion([("clean", "bogus")])


def test_percentiles_empty_returns_zeros():
    assert percentiles([]) == {"p50": 0, "p95": 0, "p99": 0, "max": 0}


def test_percentiles_single_value():
    p = percentiles([42])
    assert p == {"p50": 42, "p95": 42, "p99": 42, "max": 42}


def test_percentiles_p99_close_to_max():
    values = list(range(1, 101))  # 1..100
    p = percentiles(values)
    assert p["max"] == 100
    assert p["p99"] >= 95
    assert p["p95"] >= 90
    assert p["p50"] in {50, 51}


def test_render_markdown_summary_contains_required_sections():
    report = {
        "profile": "cloud-fast",
        "doc_count": 2,
        "dry_run": True,
        "per_kind": {
            "block_lot_format": {
                "precision": 1.0,
                "recall": 1.0,
                "f1": 1.0,
                "tp": 1,
                "fp": 0,
                "fn": 0,
                "n": 1,
            }
        },
        "verdict_confusion": {
            f"actual_{a}": dict.fromkeys(VERDICT_VALUES, 0) for a in VERDICT_VALUES
        },
        "latency_ms": {"p50": 10, "p95": 20, "p99": 25, "max": 30},
        "total_cost_usd": None,
    }
    out = render_markdown_summary(report)
    assert "DocQFlow Eval" in out
    assert "profile=cloud-fast" in out
    assert "(dry-run)" in out
    assert "Verdict confusion matrix:" in out
    assert "Per-kind P/R/F1:" in out
    assert "block_lot_format" in out
    assert "Latency: p50=" in out
    assert "Total LLM cost: (unavailable)" in out


def test_render_markdown_summary_formats_cost_when_known():
    report = {
        "profile": "cloud-fast",
        "doc_count": 1,
        "dry_run": False,
        "per_kind": {},
        "verdict_confusion": {
            f"actual_{a}": dict.fromkeys(VERDICT_VALUES, 0) for a in VERDICT_VALUES
        },
        "latency_ms": {"p50": 0, "p95": 0, "p99": 0, "max": 0},
        "total_cost_usd": 0.0712,
    }
    out = render_markdown_summary(report)
    assert "Total LLM cost: $0.0712" in out
    assert "(dry-run)" not in out


def test_kind_values_match_pipeline_schemas():
    """Sanity: metrics module reads the same IssueKind tuple the pipeline emits."""
    assert "block_lot_format" in KIND_VALUES
    assert "cost_scope_mismatch" in KIND_VALUES
    assert "description_mismatch_bank_form_3_phrasing" in KIND_VALUES
    assert len(KIND_VALUES) == 12


# ---------------------------------------------------------------------------
# End-to-end wiring with synthetic PDFs (--dry-run)
# ---------------------------------------------------------------------------

# All required fields for a Stage-5-clean doc. Address/block-lot pair shows up
# in the synthetic gazetteer below so the gazetteer rule passes; date order is
# valid; license is a 7-digit CSLB; description is non-empty.
_CLEAN_FIELDS: dict[str, str] = {
    "1 BLOCK & LOT": "9999/001",
    "1 STREET ADDRESS OF JOB BLOCK  LOT": "100 Test St",
    "DATE FILED": "4/1/2026",
    "ISSUED": "4/2/2026",
    "14C CSLB": "1234567",
    "16 DESCRIPTION": "Replace one bathroom fixture",
    "2A ESTIMATED COST OF JOB": "$5000",
    "7A PRESENT USE": "apartments",
}


def _make_acroform_pdf(
    text_fields: dict[str, str],
    *,
    form3: bool = False,
    form8: bool = True,
) -> bytes:
    """Build an AcroForm PDF with the given text fields and a Check Box8/9 pair.

    Including a checked Form-8 widget by default keeps
    ``rule_missing_form_checkbox`` from firing on every synthetic doc, so test
    expectations stay focused on the kind under test.
    """
    doc = fitz.open()
    page = doc.new_page()
    y = 72
    for name, value in text_fields.items():
        widget = fitz.Widget()
        widget.field_name = name
        widget.field_type = fitz.PDF_WIDGET_TYPE_TEXT
        widget.field_value = value
        widget.rect = fitz.Rect(72, y, 360, y + 16)
        page.add_widget(widget)
        y += 24
    for name, checked in {"Check Box8": form3, "Check Box9": form8}.items():
        widget = fitz.Widget()
        widget.field_name = name
        widget.field_type = fitz.PDF_WIDGET_TYPE_CHECKBOX
        widget.field_value = bool(checked)
        widget.rect = fitz.Rect(72, y, 100, y + 16)
        page.add_widget(widget)
        y += 24
    data = doc.tobytes()
    doc.close()
    return data


@pytest.fixture
def synthetic_corpus(tmp_path: Path) -> tuple[Path, dict, Gazetteer]:
    """Build a 6-doc synthetic corpus + matching labels.json + gazetteer.

    The corpus mixes one clean doc with five mutated docs covering Stage-5
    rule kinds that don't depend on the LLM. Returns the corpus dir, the
    in-memory labels dict, and a gazetteer wired so the clean doc's
    block/lot resolves to its address.
    """
    corpus = tmp_path / "corpus"
    corpus.mkdir()

    docs: list[tuple[str, dict[str, str], list[dict]]] = [
        # (filename, fields, mutations)
        ("clean.pdf", _CLEAN_FIELDS, []),
        (
            "missing_block_lot.pdf",
            {**_CLEAN_FIELDS, "1 BLOCK & LOT": ""},
            [{"kind": "missing_block_lot", "field": "1 BLOCK & LOT"}],
        ),
        (
            "block_lot_format.pdf",
            {**_CLEAN_FIELDS, "1 BLOCK & LOT": "9999001"},  # missing slash
            [{"kind": "block_lot_format", "field": "1 BLOCK & LOT"}],
        ),
        (
            "missing_street_number.pdf",
            {**_CLEAN_FIELDS, "1 STREET ADDRESS OF JOB BLOCK  LOT": "Test St"},
            [
                {
                    "kind": "missing_street_number",
                    "field": "1 STREET ADDRESS OF JOB BLOCK  LOT",
                }
            ],
        ),
        (
            "license_digit_drop.pdf",
            {**_CLEAN_FIELDS, "14C CSLB": "12345"},  # 5 digits — below 6-8 range
            [{"kind": "license_digit_drop", "field": "14C CSLB"}],
        ),
        (
            "date_impossibility_swap.pdf",
            {**_CLEAN_FIELDS, "DATE FILED": "4/2/2026", "ISSUED": "4/1/2026"},
            [{"kind": "date_impossibility_swap", "field": "DATE FILED"}],
        ),
    ]

    labels: dict[str, dict] = {}
    for filename, fields, mutations in docs:
        (corpus / filename).write_bytes(_make_acroform_pdf(fields))
        if not mutations:
            flavor = "correct"
        elif any(m["kind"] == "date_impossibility_swap" for m in mutations):
            flavor = "major"
        else:
            flavor = "minor"
        labels[filename] = {
            "flavor": flavor,
            "mutation_count": len(mutations),
            "mutations": mutations,
            "permit_number": filename.replace(".pdf", ""),
            "permit_type": "8",
        }

    (corpus / "labels.json").write_text(json.dumps(labels, indent=2))

    # Tiny gazetteer with just the clean doc's parcel — keeps the address rule
    # silent (it only fires when block_lot resolves AND the address differs).
    gz_csv = tmp_path / "gazetteer.csv"
    gz_csv.write_text(
        "block_lot,address,normalized_address\n9999/001,100 Test St,100 test st\n"
    )
    gazetteer = Gazetteer.load(gz_csv)
    return corpus, labels, gazetteer


@pytest.fixture(autouse=True)
def _reset_gazetteer_singleton(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(gazetteer_mod, "_instance", None)


async def test_evaluate_corpus_dry_run_end_to_end(
    synthetic_corpus: tuple[Path, dict, Gazetteer],
) -> None:
    corpus, labels, gz = synthetic_corpus

    report = await evaluate_corpus(
        profile="cloud-fast",
        corpus_dir=corpus,
        labels=labels,
        gazetteer=gz,
        dry_run=True,
    )

    # Top-level shape per the bead AC.
    required_keys = {
        "profile",
        "doc_count",
        "dry_run",
        "per_kind",
        "verdict_confusion",
        "latency_ms",
        "total_cost_usd",
        "skipped",
        "generated_at",
    }
    assert required_keys.issubset(report.keys())
    assert report["doc_count"] == len(labels)
    assert report["dry_run"] is True
    assert report["total_cost_usd"] is None  # dry-run never tallies cost

    # Confusion matrix must sum to doc_count.
    cm = report["verdict_confusion"]
    grand_total = sum(c for row in cm.values() for c in row.values())
    assert grand_total == report["doc_count"]

    # Each mutated kind should have at least one TP (rule fired correctly).
    for kind in (
        "missing_block_lot",
        "block_lot_format",
        "missing_street_number",
        "license_digit_drop",
        "date_impossibility_swap",
    ):
        assert kind in report["per_kind"], f"expected {kind} in per_kind"
        assert report["per_kind"][kind]["tp"] >= 1, (
            f"{kind} produced no TP; got {report['per_kind'][kind]}"
        )

    # Latency stats are present and non-negative.
    lat = report["latency_ms"]
    assert {"p50", "p95", "p99", "max"} <= lat.keys()
    for v in lat.values():
        assert isinstance(v, int)
        assert v >= 0

    # JSON-serializable as-is.
    json.dumps(report)


async def test_evaluate_corpus_respects_limit(
    synthetic_corpus: tuple[Path, dict, Gazetteer],
) -> None:
    corpus, labels, gz = synthetic_corpus
    report = await evaluate_corpus(
        profile="cloud-fast",
        corpus_dir=corpus,
        labels=labels,
        gazetteer=gz,
        dry_run=True,
        limit=2,
    )
    assert report["doc_count"] == 2


async def test_evaluate_corpus_records_skipped_when_pdf_missing(
    synthetic_corpus: tuple[Path, dict, Gazetteer],
) -> None:
    corpus, labels, gz = synthetic_corpus
    labels = {
        **labels,
        "missing.pdf": {
            "flavor": "correct",
            "mutation_count": 0,
            "mutations": [],
            "permit_number": "x",
            "permit_type": "8",
        },
    }
    report = await evaluate_corpus(
        profile="cloud-fast",
        corpus_dir=corpus,
        labels=labels,
        gazetteer=gz,
        dry_run=True,
    )
    assert "missing.pdf" in report["skipped"]
    assert report["doc_count"] == len(labels) - 1


def test_load_labels_round_trips(tmp_path: Path) -> None:
    labels = {"a.pdf": {"flavor": "correct", "mutation_count": 0, "mutations": []}}
    path = tmp_path / "labels.json"
    path.write_text(json.dumps(labels))
    assert load_labels(path) == labels
