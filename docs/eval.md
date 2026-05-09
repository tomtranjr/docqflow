# Pipeline eval harness

`scripts/eval_pipeline.py` grades the Stages 4–6 pipeline against the
labelled corpus at `data/permit-3-8/labels.json`. It is the regression
yardstick for changes to extract / validate / reason: same script, same
corpus, same labels — different metrics tell you what got better or worse.

## How to run

```bash
# Smoke run — no LLM, fast (~1s for 5 docs). Use this in CI / pre-push.
uv run python scripts/eval_pipeline.py --profile cloud-fast --dry-run --limit 5

# Full live evaluation. Calls the LLM; expect ~$0.07 for 100 docs on cloud-fast.
uv run python scripts/eval_pipeline.py --profile cloud-fast --out _scratch/eval.json
```

Flags:

| Flag | Default | Purpose |
| --- | --- | --- |
| `--profile` | _required_ | Profile name from `src/pipeline/llm_profiles.py` (only `cloud-fast` today). |
| `--limit N` | _all docs_ | Cap document count. Sliced from a filename-sorted list, so the same `N` always picks the same docs. |
| `--out PATH` | _stdout only_ | Write the full JSON report to `PATH`. The Markdown summary still goes to stdout. |
| `--dry-run` | _off_ | Mock the LLM at `reason.judge` so only Stages 4–5 run. No live API calls, no cost. |
| `--corpus-dir DIR` | `data/permit-3-8` | Override the corpus directory (rarely needed). |
| `--labels PATH` | `<corpus-dir>/labels.json` | Override the labels file. |

The corpus and labels live under `data/permit-3-8/` which is gitignored.
On a clean clone the live eval has nothing to score; the synthetic-PDF
test in `tests/eval/test_eval_pipeline.py` is what proves the harness
itself works in CI.

## How to read the report

The JSON report has these top-level keys:

```jsonc
{
  "profile": "cloud-fast",
  "doc_count": 100,
  "dry_run": false,
  "per_kind": {
    "block_lot_format": {
      "precision": 1.0, "recall": 0.9, "f1": 0.947,
      "tp": 9, "fp": 0, "fn": 1, "n": 10
    }
    // … one entry per IssueKind that was either predicted or in ground truth
  },
  "verdict_confusion": {
    "actual_clean": { "clean": 49, "minor": 1, "major": 0 },
    "actual_minor": { "clean": 2,  "minor": 27, "major": 1 },
    "actual_major": { "clean": 0,  "minor": 1,  "major": 19 }
  },
  "latency_ms": { "p50": 2100, "p95": 4800, "p99": 7200, "max": 9100 },
  "total_cost_usd": 0.07,
  "skipped": [],
  "generated_at": "2026-05-08T19:32:00.123456+00:00"
}
```

### Per-kind precision / recall / F1

For each `IssueKind`, predictions and ground truth are compared per-doc as
multiset counts:

```
tp_doc = min(predicted_count, ground_truth_count)
fp_doc = max(predicted_count - ground_truth_count, 0)
fn_doc = max(ground_truth_count - predicted_count, 0)
```

These sum across docs. Then:

```
precision = tp / (tp + fp)
recall    = tp / (tp + fn)
f1        = harmonic mean of precision and recall
n         = total ground-truth occurrences for this kind
```

Both precision and recall fall back to 0.0 when their denominator is 0
(no predictions / no ground truth). F1 is 0.0 whenever either input is.

What to look at:

* **Low precision (lots of FPs)** means a rule is firing on clean docs.
  In Stage 5, suspect a regex that's too loose or a gazetteer mismatch.
  In Stage 6, suspect a confidence threshold that's too low or a prompt
  that's flagging false positives.
* **Low recall (lots of FNs)** means real mutations slip past. Stage 5
  rules are deterministic, so a low recall there usually means a parsing
  edge case (date format, missing field) — track down the specific
  failing fixture in `data/permit-3-8/`. Stage 6 low recall is more
  likely a prompt or model issue.
* **`n`** is the absolute count of ground-truth occurrences. Treat
  metrics with `n < 5` as anecdotal — the corpus is small.

The LLM-only kinds (`cost_scope_mismatch`,
`description_mismatch_bank_form_3_phrasing`) will always show
`P=0 R=0 F1=0` under `--dry-run`, because the LLM is mocked off. That's
the dry-run contract, not a regression.

### Verdict confusion matrix

A 3×3 matrix of `(actual, predicted)` verdict pairs. Rows sum to the
number of docs with each actual flavor. The on-diagonal cells are
correct predictions; off-diagonal cells are misclassifications.

Under `--dry-run`, every actual-major doc whose only mutation is an
LLM-only kind (cost / description) collapses to `predicted=clean` because
those rules are mocked off. So expect the `actual_major / pred_clean`
cell to be elevated in dry-run and small in a live run.

### Latency

`p50 / p95 / p99 / max` are nearest-rank percentiles over per-doc
`latency_ms` (the same number the API returns in `PipelineResult`).
In dry-run these are essentially 0; in a live run, p95 should sit
under ~5s for `cloud-fast`.

### LLM cost

`total_cost_usd` is summed from
`response._hidden_params["response_cost"]` on every wrapped
`litellm.acompletion` call during the run. It is `null` whenever:

* `--dry-run` is set (no LLM calls happen), or
* LiteLLM didn't surface `response_cost` for at least one observed call
  (the run flips `computable=False` on the first miss). Some providers
  or model configurations don't populate `_hidden_params["response_cost"]`;
  if you see `null` on what should be a live run, check the LiteLLM
  version and that the model is in its pricing table.

Cost reporting is intentionally best-effort. If it turns out to be
unreliable in practice, follow-up work can either (a) thread cost out of
`run_pipeline` via a schema addition (out of scope for this bead) or
(b) compute cost from `usage.prompt_tokens` / `usage.completion_tokens`
plus a hard-coded price table.

Ballpark expectation today: ~$0.07 for the full 100-doc corpus on
`cloud-fast` (`openai/gpt-4o-mini`). Update this number whenever you do
a fresh live run so the doc stays calibrated.
