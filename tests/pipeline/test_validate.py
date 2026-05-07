"""Tests for Stage 5 deterministic validation rules.

One positive (rule fires) and one negative (rule does not fire) case per kind,
exercising the public ``run_rules`` entrypoint with synthetic field dicts.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from src.pipeline import Gazetteer
from src.pipeline.schemas import ExtractedFields, Issue
from src.pipeline.validate import (
    ADDRESS_FIELD,
    BLOCK_LOT_FIELD,
    DATE_FILED_FIELD,
    DESCRIPTION_FIELDS,
    FORM_CHECKBOX_FIELDS,
    ISSUED_FIELD,
    LICENSE_FIELD,
    run_rules,
)

FIXTURE_PATH = Path(__file__).resolve().parents[1] / "fixtures" / "gazetteer_sample.csv"


@pytest.fixture
def gazetteer() -> Gazetteer:
    return Gazetteer.load(csv_path=FIXTURE_PATH)


def _baseline_fields() -> ExtractedFields:
    """A clean field dict that triggers no rules. 1428/017 → 277 05th Av."""
    fields: ExtractedFields = {
        BLOCK_LOT_FIELD: "1428/017",
        ADDRESS_FIELD: "277 05th Av",
        DATE_FILED_FIELD: "4/24/2026",
        ISSUED_FIELD: "4/24/2026",
        LICENSE_FIELD: "836689",
        FORM_CHECKBOX_FIELDS[0]: True,
        FORM_CHECKBOX_FIELDS[1]: None,
    }
    fields[DESCRIPTION_FIELDS[0]] = "interior remodel"
    for f in DESCRIPTION_FIELDS[1:]:
        fields[f] = None
    return fields


def _kinds(issues: list[Issue]) -> list[str]:
    return [i.kind for i in issues]


class TestBaseline:
    def test_clean_baseline_yields_no_issues(self, gazetteer: Gazetteer) -> None:
        assert run_rules(_baseline_fields(), gazetteer) == []


class TestMissingBlockLot:
    def test_empty_value_fires(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        f[BLOCK_LOT_FIELD] = None
        assert "missing_block_lot" in _kinds(run_rules(f, gazetteer))

    def test_present_value_does_not_fire(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        assert "missing_block_lot" not in _kinds(run_rules(f, gazetteer))


class TestMissingDescription:
    def test_all_description_fields_empty_fires(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        for field in DESCRIPTION_FIELDS:
            f[field] = None
        assert "missing_description" in _kinds(run_rules(f, gazetteer))

    def test_any_part_present_does_not_fire(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        f[DESCRIPTION_FIELDS[0]] = None
        f[DESCRIPTION_FIELDS[2]] = "some text"
        assert "missing_description" not in _kinds(run_rules(f, gazetteer))


class TestMissingStreetNumber:
    def test_no_leading_number_fires(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        f[BLOCK_LOT_FIELD] = "9999/999"  # avoid downstream gazetteer hits
        f[ADDRESS_FIELD] = "Chestnut St"
        assert "missing_street_number" in _kinds(run_rules(f, gazetteer))

    def test_leading_number_does_not_fire(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        assert "missing_street_number" not in _kinds(run_rules(f, gazetteer))


class TestMissingFormCheckbox:
    def test_neither_box_set_fires(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        f[FORM_CHECKBOX_FIELDS[0]] = None
        f[FORM_CHECKBOX_FIELDS[1]] = False
        assert "missing_form_checkbox" in _kinds(run_rules(f, gazetteer))

    def test_one_box_set_does_not_fire(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        f[FORM_CHECKBOX_FIELDS[0]] = None
        f[FORM_CHECKBOX_FIELDS[1]] = True
        assert "missing_form_checkbox" not in _kinds(run_rules(f, gazetteer))


class TestBlockLotFormat:
    def test_bad_format_fires(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        f[BLOCK_LOT_FIELD] = "6509062"
        assert "block_lot_format" in _kinds(run_rules(f, gazetteer))

    def test_good_format_does_not_fire(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        assert "block_lot_format" not in _kinds(run_rules(f, gazetteer))

    def test_missing_block_lot_suppresses_format_rule(
        self, gazetteer: Gazetteer
    ) -> None:
        f = _baseline_fields()
        f[BLOCK_LOT_FIELD] = ""
        kinds = _kinds(run_rules(f, gazetteer))
        assert "missing_block_lot" in kinds
        assert "block_lot_format" not in kinds


class TestLicenseDigitDrop:
    def test_short_license_fires(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        f[LICENSE_FIELD] = "73267"  # 5 digits
        assert "license_digit_drop" in _kinds(run_rules(f, gazetteer))

    def test_six_digit_license_does_not_fire(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        assert "license_digit_drop" not in _kinds(run_rules(f, gazetteer))


class TestDateImpossibilitySwap:
    def test_filed_after_issued_fires(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        f[DATE_FILED_FIELD] = "4/23/2026"
        f[ISSUED_FIELD] = "4/13/2026"
        assert "date_impossibility_swap" in _kinds(run_rules(f, gazetteer))

    def test_filed_before_issued_does_not_fire(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        f[DATE_FILED_FIELD] = "4/13/2026"
        f[ISSUED_FIELD] = "4/23/2026"
        assert "date_impossibility_swap" not in _kinds(run_rules(f, gazetteer))


class TestStreetSuffixSwap:
    def test_suffix_swap_fires(self, gazetteer: Gazetteer) -> None:
        # Gazetteer: 1272/004 → 943 Cole St; mutated to "Ave"
        f = _baseline_fields()
        f[BLOCK_LOT_FIELD] = "1272/004"
        f[ADDRESS_FIELD] = "943 Cole Ave"
        assert "street_suffix_swap" in _kinds(run_rules(f, gazetteer))

    def test_matching_suffix_does_not_fire(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        f[BLOCK_LOT_FIELD] = "1272/004"
        f[ADDRESS_FIELD] = "943 Cole St"
        assert "street_suffix_swap" not in _kinds(run_rules(f, gazetteer))


class TestAddressTypo:
    def test_close_typo_fires(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        f[BLOCK_LOT_FIELD] = "6509/062"
        f[ADDRESS_FIELD] = "3841 24tt St"
        assert "address_typo" in _kinds(run_rules(f, gazetteer))

    def test_exact_match_does_not_fire(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        f[BLOCK_LOT_FIELD] = "6509/062"
        f[ADDRESS_FIELD] = "3841 24th St"
        assert "address_typo" not in _kinds(run_rules(f, gazetteer))


class TestAddressBlockLotMismatch:
    def test_distant_address_fires(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        f[BLOCK_LOT_FIELD] = "1272/004"  # 943 Cole St
        f[ADDRESS_FIELD] = "595 Market St"
        assert "address_block_lot_mismatch" in _kinds(run_rules(f, gazetteer))

    def test_matching_address_does_not_fire(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        assert "address_block_lot_mismatch" not in _kinds(run_rules(f, gazetteer))


class TestRuleOrder:
    def test_issues_emitted_in_registry_order(self, gazetteer: Gazetteer) -> None:
        f = _baseline_fields()
        f[BLOCK_LOT_FIELD] = "9999/999"
        for field in DESCRIPTION_FIELDS:
            f[field] = None
        f[LICENSE_FIELD] = "73267"
        kinds = _kinds(run_rules(f, gazetteer))
        assert kinds.index("missing_description") < kinds.index("license_digit_drop")
