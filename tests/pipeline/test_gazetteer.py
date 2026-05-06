"""Tests for the SF parcel gazetteer loader."""

from __future__ import annotations

import importlib
from pathlib import Path

import pytest

from src.pipeline import Gazetteer
from src.pipeline import gazetteer as gazetteer_module

FIXTURE_PATH = Path(__file__).resolve().parents[1] / "fixtures" / "gazetteer_sample.csv"


@pytest.fixture
def fixture_gazetteer() -> Gazetteer:
    return Gazetteer.load(csv_path=FIXTURE_PATH)


class TestLookup:
    def test_known_block_lot_returns_canonical_address(
        self, fixture_gazetteer: Gazetteer
    ) -> None:
        assert fixture_gazetteer.lookup_address("1428/017") == "277 05th Av"

    def test_missing_block_lot_returns_none(self, fixture_gazetteer: Gazetteer) -> None:
        assert fixture_gazetteer.lookup_address("9999/999") is None

    def test_unsigned_input_normalizes_to_slashed_form(
        self, fixture_gazetteer: Gazetteer
    ) -> None:
        assert fixture_gazetteer.lookup_address("1428017") == "277 05th Av"

    def test_whitespace_stripped(self, fixture_gazetteer: Gazetteer) -> None:
        assert fixture_gazetteer.lookup_address("  6509/062  ") == "3841 24th St"

    def test_malformed_input_returns_none(self, fixture_gazetteer: Gazetteer) -> None:
        assert fixture_gazetteer.lookup_address("not-a-block-lot") is None


class TestClosestAddress:
    def test_typo_within_threshold_returns_canonical(
        self, fixture_gazetteer: Gazetteer
    ) -> None:
        # one-character typo: "St" -> "Stt"
        match = fixture_gazetteer.closest_address("3841 24th Stt")
        assert match is not None
        addr, score = match
        assert addr == "3841 24th St"
        assert score >= 0.85

    def test_below_threshold_returns_none(self, fixture_gazetteer: Gazetteer) -> None:
        assert fixture_gazetteer.closest_address("zzzzz nowhere blvd qqqqq") is None

    def test_exact_match_scores_one(self, fixture_gazetteer: Gazetteer) -> None:
        match = fixture_gazetteer.closest_address("3841 24th St")
        assert match is not None
        addr, score = match
        assert addr == "3841 24th St"
        assert score == pytest.approx(1.0)

    def test_high_threshold_filters_out_noisy_matches(
        self, fixture_gazetteer: Gazetteer
    ) -> None:
        loose_match = fixture_gazetteer.closest_address("oak", threshold=0.5)
        strict_match = fixture_gazetteer.closest_address("oak", threshold=0.99)
        assert loose_match is not None
        assert strict_match is None

    def test_normalization_handles_case_and_whitespace(
        self, fixture_gazetteer: Gazetteer
    ) -> None:
        match = fixture_gazetteer.closest_address("  3841   24TH   ST ")
        assert match is not None
        addr, _ = match
        assert addr == "3841 24th St"


class TestLoad:
    def test_explicit_path_returns_fresh_instances(self) -> None:
        a = Gazetteer.load(csv_path=FIXTURE_PATH)
        b = Gazetteer.load(csv_path=FIXTURE_PATH)
        assert a is not b

    def test_no_arg_load_returns_singleton(self) -> None:
        importlib.reload(gazetteer_module)
        first = gazetteer_module.Gazetteer.load()
        second = gazetteer_module.Gazetteer.load()
        assert first is second
