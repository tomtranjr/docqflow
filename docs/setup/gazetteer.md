# Gazetteer Setup

The SF parcel gazetteer maps San Francisco block/lot numbers to canonical street addresses. The pipeline's Stage 5 address rules (`address_block_lot_mismatch`, `address_typo`, `street_suffix_swap`) read from this gazetteer in-process — there is no live API call.

## Prerequisites

- A working dev install per the project README (`uv sync`)
- The `rapidfuzz` dependency, installed automatically via `pyproject.toml`

## Where the data lives

| Path | Purpose |
|---|---|
| `data/gazetteer/sf_parcels.csv` | Production gazetteer (committed, hand-curated) |
| `tests/fixtures/gazetteer_sample.csv` | Smaller fixture used by `tests/pipeline/test_gazetteer.py` |
| `src/pipeline/gazetteer.py` | Loader + public API (`Gazetteer.load`, `lookup_address`, `closest_address`) |

The CSV uses three columns:

| Column | Example | Notes |
|---|---|---|
| `block_lot` | `1428/017` | Canonical `NNNN/NNN`. Loader also accepts unsigned `NNNNNNN` and reformats. |
| `address` | `277 05th Av` | Display form, preserved as-is when returned from `lookup_address`. |
| `normalized_address` | `277 05th av` | Lowercase, whitespace-collapsed; used as the rapidfuzz haystack. |

## Adding rows manually

1. Open `data/gazetteer/sf_parcels.csv`.
2. Append one row per parcel. Match the existing column order. Block/lot must be canonical (`NNNN/NNN`).
3. Compute `normalized_address` as `address.lower()` with all internal whitespace collapsed to single spaces.
4. Run the targeted tests to confirm the loader still parses cleanly:

   ```bash
   uv run pytest tests/pipeline/test_gazetteer.py -v
   ```

5. Commit with a message like `chore: add gazetteer rows for <area>`.

## Refresh cadence

The CSV is **manually maintained** in v1. Live ingestion from SF Open Data (Socrata `acdm-wktn` parcel dataset) is a future stretch goal. When it lands, the loader API does not change — only the source of the file does.

## Loader behavior at a glance

- `Gazetteer.load()` (no args) returns a process-wide singleton, loaded from `data/gazetteer/sf_parcels.csv`. Idempotent and thread-safe — the FastAPI lifespan calls this once at startup and stashes the result on `app.state.gazetteer`.
- `Gazetteer.load(csv_path=...)` returns a fresh instance bypassing the cache; intended for tests.
- `lookup_address(block_lot)` does an exact dictionary lookup after normalizing the input.
- `closest_address(query, threshold=0.85)` runs `rapidfuzz.process.extractOne` over the normalized addresses and returns `(display_address, score)` only if the score (`0.0`–`1.0`) clears the threshold.
