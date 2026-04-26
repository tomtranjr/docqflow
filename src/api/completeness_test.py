from src.api.completeness import REQUIRED_FIELDS, evaluate


def test_evaluate_passed_when_all_required_present():
    fields = {f: "x" for f in REQUIRED_FIELDS}
    result = evaluate(fields)
    assert result.passed is True
    assert result.missing == []


def test_evaluate_lists_missing_in_canonical_order():
    fields = {f: "x" for f in REQUIRED_FIELDS}
    fields["estimated_cost"] = None
    fields["license_number"] = None
    result = evaluate(fields)
    assert result.passed is False
    assert result.missing == ["estimated_cost", "license_number"]


def test_evaluate_handles_missing_keys_as_none():
    result = evaluate({})
    assert result.passed is False
    assert set(result.missing) == set(REQUIRED_FIELDS)


def test_evaluate_handles_empty_strings_as_missing():
    fields = {f: "" for f in REQUIRED_FIELDS}
    result = evaluate(fields)
    assert result.passed is False
    assert set(result.missing) == set(REQUIRED_FIELDS)
