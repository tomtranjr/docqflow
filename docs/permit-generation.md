# Permit PDF Generation

A guide to `generate_permits.py` — the one-shot script that builds training data for the validation/reasoning pipeline.

## Purpose

This script is **not part of production**. Its only job is to produce a fixed batch of Form 3-8 PDFs that exercise the downstream validation pipeline. The classifier in `src/classifier.py` treats every PDF in `data/permit-3-8/` as the positive class (binary: permit-3-8 vs not), so all three error tiers live side-by-side in that folder.

The script generates three flavors of PDFs:

| Flavor | What it tests |
|---|---|
| `correct` | Ground truth. The validator should NOT flag these. |
| `minor` | Field-level errors (typos, wrong date format, malformed cost). The validator should catch syntactic problems. |
| `major` | Semantic mismatch — description doesn't match the permit type. The validator should catch wrong-form-for-the-job errors. |

## How to run

Default (50 correct / 30 minor / 20 major = 100 PDFs):

```bash
uv run python scripts/generate_permits.py
```

Smoke run (no DBI scraping, small batch, wipe before generating):

```bash
uv run python scripts/generate_permits.py --reset --correct 4 --minor 3 --major 3 --skip-scrape
```

Custom split:

```bash
uv run python scripts/generate_permits.py --reset --correct 70 --minor 20 --major 10
```

## Filename scheme

Every output filename encodes the flavor and (for errors) the mutation count:

```
permit-3-8_correct_202604089123.pdf
permit-3-8_minor-2_202604089127.pdf       2 field mutations
permit-3-8_minor-3_202604089134.pdf       3 field mutations
permit-3-8_major-1_202604089128.pdf       1 semantic mismatch
```

Format: `permit-3-8_<flavor>[-<n>]_<permit_number>.pdf`

You can tell at a glance from `ls` which file is supposed to test what.

## CLI flags

| Flag | Default | Notes |
|---|---|---|
| `--correct N` | 50 | Number of correct PDFs |
| `--minor N` | 30 | Number of minor-error PDFs |
| `--major N` | 20 | Number of major-error PDFs |
| `--reset` | off | Wipe `data/permit-3-8/*.pdf` (preserves template) and delete the manifest before generating |
| `--skip-scrape` | off | Skip DBI contractor lookups (faster, less data) |
| `--delay SECONDS` | 3.0 | Delay between DBI requests |
| `--output-dir`, `--template`, `--verbose` | — | As named |

## Minor vs major: the dividing line

**Minor** errors are single-field surface damage (a typo, a blank field, a malformed format). A reviewer would say "this field is messed up." Each minor PDF has 1 to 3 independent field mutations (set by `MAX_MINOR_MUTATIONS` in the script).

**Major** errors are cross-field contradictions where two or more fields tell a story that doesn't add up. A reviewer would say "something is fundamentally wrong with this permit." Each major PDF has exactly one major mutation, sampled uniformly from four types (semantic, numerical, temporal, spatial).

## Minor-error mutations

Deterministically seeded by the permit number. Available mutations:

- Address typo: swap two adjacent letters in the street name
- License: drop a digit from CSLB number
- Street suffix: `St` becomes `Ave` (or vice versa)
- Missing street number: drop the leading number from the job address (`5717 Geary Bl` becomes `Geary Bl`)
- Missing block & lot: clear the `1 BLOCK & LOT` field (DBI Section 2 requires it)
- Block & lot format: replace the `/` separator with `-`, `.`, space, or no separator (DBI specifies `0000/111`)
- Missing form checkbox: clear the Form 3 or Form 8 checkbox at the top — applicant forgets to mark which form they're filing
- Missing description: clear all five description fields (16, 16A-D)

Mutations whose target field is missing in a given record are skipped. The filename's mutation count reflects mutations actually applied.

## Major-error mutations

Each major PDF gets exactly one of these four cross-field contradictions, sampled uniformly per permit number. The four cover different "shapes" of error:

### 1. Description vs. permit type (semantic)

Description is replaced with a hardcoded mismatched phrase from `MAJOR_DESCRIPTION_BANK`.

- Form 3 (new construction) records get Form 8 phrasing ("Replace existing water heater in kitchen, like for like.")
- Form 8 (OTC alterations) records get Form 3 phrasing ("New construction of 4-story mixed-use building...")

### 2. Cost vs. scope (numerical)

The estimated cost is swapped with one from a record on the opposite side of the pool's cost median. A small-scope job ("replace bathroom faucet") gets a multi-million-dollar valuation, or a new-construction record gets a $500 cost. The description still describes the original scope, so the cost no longer fits the work.

### 3. Date impossibility (temporal)

`DATE FILED` and `ISSUED` values are swapped, so issued date precedes filed date — logically impossible. Pure rule-checkable.

### 4. Address vs. block/lot (spatial)

The street address stays, but the block/lot is overwritten with values from a different real record. Simulates a data-entry copy-paste error where two fields that should reference the same parcel point to different locations.

## Ground-truth labels

Every run writes `data/permit-3-8/labels.json` — the supervised-learning answer key. For each generated PDF it records exactly which fields were mutated, the original value, the new value, and a machine-readable `kind` tag:

```json
{
  "permit-3-8_minor-2_202604179664.pdf": {
    "flavor": "minor",
    "permit_number": "202604179664",
    "permit_type": "8",
    "mutation_count": 2,
    "mutations": [
      {
        "field": "1 STREET ADDRESS OF JOB BLOCK  LOT",
        "before": "773 Gates St",
        "after": "773 Gate sSt",
        "kind": "address_typo"
      },
      {
        "field": "1 BLOCK & LOT",
        "before": "5642/021",
        "after": "5642-021",
        "kind": "block_lot_format"
      }
    ]
  },
  "permit-3-8_major-1_202604230014.pdf": {
    "flavor": "major",
    "permit_number": "202604230014",
    "permit_type": "8",
    "mutation_count": 1,
    "mutations": [
      {
        "field": "description",
        "before": "install 480v, 4000amp service...",
        "after": "Erect new 3-story single-family dwelling on vacant lot.",
        "kind": "description_mismatch_bank_form_3_phrasing"
      }
    ]
  },
  "permit-3-8_correct_202604240079.pdf": {
    "flavor": "correct",
    "permit_number": "202604240079",
    "permit_type": "8",
    "mutation_count": 0,
    "mutations": []
  }
}
```

**How to use it for verification:**

- **Manual spot-check**: open any generated PDF, look up its filename in `labels.json`, and confirm the listed mutations match what you see.
- **Pipeline evaluation**: have the validator output a list of flagged fields per PDF, then compare against `mutations[].field` in the labels file. That gives you precision (was every flag correct?) and recall (did it catch every mutation?).
- **Per-mutation-type breakdown**: group results by `kind` to see which mutation classes the validator catches reliably and which it misses.

`labels.json` is appended-to on re-runs (without `--reset`), so it accumulates a growing labeled dataset.

## Determinism

Every mutation is seeded by `sha256(permit_number)`. Re-running the script against the same SODA records produces byte-identical PDFs, so you can regenerate the dataset and your validator's outputs stay reproducible.

## Manifest and `--reset`

The script writes `data/permit-3-8/.manifest.json` listing every permit number that has been used:

```json
{
  "used_permit_numbers": ["202604089123", "202604089127"]
}
```

On subsequent runs (without `--reset`), records already in the manifest are skipped, so re-running appends new permits instead of duplicating. Use `--reset` to wipe everything and start clean.

The manifest is gitignored along with the rest of `data/`.
