"""SF parcel gazetteer loader.

Provides in-process lookup from canonical block/lot to display address, plus
fuzzy address matching via rapidfuzz. Backs the Stage 5 address rules
(`address_block_lot_mismatch`, `address_typo`, `street_suffix_swap`).

The data source is a hand-curated CSV at `data/gazetteer/sf_parcels.csv`. A
future stretch goal will refresh that CSV from SF Open Data; the public API
here does not change when that lands.
"""

from __future__ import annotations

import csv
import logging
import re
import threading
from pathlib import Path

from rapidfuzz import fuzz, process

log = logging.getLogger(__name__)

# Resolve relative to the source file so the loader works regardless of CWD.
_REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CSV_PATH = _REPO_ROOT / "data" / "gazetteer" / "sf_parcels.csv"

_CANONICAL_RE = re.compile(r"^(\d{4})/(\d{3})$")
_UNSIGNED_RE = re.compile(r"^(\d{4})(\d{3})$")

_lock = threading.Lock()
_instance: Gazetteer | None = None


def _normalize_block_lot(raw: str) -> str:
    s = raw.strip()
    if _CANONICAL_RE.match(s):
        return s
    m = _UNSIGNED_RE.match(s)
    if m:
        return f"{m.group(1)}/{m.group(2)}"
    return s


def _normalize_address(raw: str) -> str:
    return " ".join(raw.lower().split())


class Gazetteer:
    """Block/lot → address lookup with fuzzy address matching."""

    def __init__(
        self, by_block_lot: dict[str, str], normalized_pairs: list[tuple[str, str]]
    ) -> None:
        self._by_block_lot = by_block_lot
        self._normalized_pairs = normalized_pairs

    @classmethod
    def load(cls, csv_path: Path | None = None) -> Gazetteer:
        """Load a gazetteer from CSV.

        With no `csv_path`, returns the process-wide singleton built from
        `data/gazetteer/sf_parcels.csv` (idempotent, thread-safe). With an
        explicit `csv_path`, returns a fresh instance and bypasses the cache —
        intended for tests that inject custom fixtures.
        """
        if csv_path is not None:
            return cls._build(csv_path)

        global _instance
        if _instance is not None:
            return _instance
        with _lock:
            if _instance is None:
                _instance = cls._build(DEFAULT_CSV_PATH)
            return _instance

    @classmethod
    def _build(cls, csv_path: Path) -> Gazetteer:
        by_block_lot: dict[str, str] = {}
        normalized_pairs: list[tuple[str, str]] = []
        with csv_path.open(encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                bl = _normalize_block_lot(row["block_lot"])
                addr = row["address"].strip()
                norm = (
                    row.get("normalized_address") or ""
                ).strip() or _normalize_address(addr)
                by_block_lot.setdefault(bl, addr)
                normalized_pairs.append((norm, addr))
        log.info("loaded %d gazetteer rows from %s", len(by_block_lot), csv_path)
        return cls(by_block_lot, normalized_pairs)

    def lookup_address(self, block_lot: str) -> str | None:
        return self._by_block_lot.get(_normalize_block_lot(block_lot))

    def closest_address(
        self, query: str, threshold: float = 0.85
    ) -> tuple[str, float] | None:
        """Find the closest gazetteer address to `query` via rapidfuzz.

        Returns `(display_address, score)` where `score` is in `[0.0, 1.0]` and
        `>= threshold`. Returns None if no candidate clears the threshold or the
        gazetteer is empty.
        """
        if not self._normalized_pairs:
            return None
        normalized_query = _normalize_address(query)
        choices = [pair[0] for pair in self._normalized_pairs]
        match = process.extractOne(normalized_query, choices, scorer=fuzz.WRatio)
        if match is None:
            return None
        _, score, idx = match
        score_unit = score / 100.0
        if score_unit < threshold:
            return None
        return self._normalized_pairs[idx][1], score_unit
