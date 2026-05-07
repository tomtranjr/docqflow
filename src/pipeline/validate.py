"""Stage 5: deterministic validation rules.

Each rule is a pure function ``(fields, gazetteer) -> list[Issue]``. The
canonical ``RULES`` list defines execution order; rule order is the emitted
issues order so the UI is deterministic.

Suppression: a ``missing_*`` rule suppresses the format/address rule that
reads the same field. Suppression is implemented inline by the format rule
short-circuiting when its source field is empty.
"""

from __future__ import annotations

import logging
import re
from collections.abc import Callable
from datetime import datetime

from rapidfuzz import fuzz

from src.pipeline.gazetteer import Gazetteer
from src.pipeline.schemas import ExtractedFields, Issue

log = logging.getLogger(__name__)

Rule = Callable[[ExtractedFields, Gazetteer], list[Issue]]

BLOCK_LOT_FIELD = "1 BLOCK & LOT"
ADDRESS_FIELD = "1 STREET ADDRESS OF JOB BLOCK  LOT"  # double space is intentional
DATE_FILED_FIELD = "DATE FILED"
ISSUED_FIELD = "ISSUED"
LICENSE_FIELD = "14C CSLB"
FORM_CHECKBOX_FIELDS = ("Check Box8", "Check Box9")
DESCRIPTION_FIELDS = (
    "16 DESCRIPTION",
    "16A DESCRIPTION",
    "16B DESCRIPTION",
    "16C DESCRIPTION",
    "16D DESCRIPTION",
)

_BLOCK_LOT_RE = re.compile(r"^\d{4}/\d{3}$")
_LEADING_NUMBER_RE = re.compile(r"^\d+\b")
# CA CSLB license numbers are typically 6-8 digits.
_LICENSE_OK_LEN = range(6, 9)

# Common SF street suffix tokens (lowercase) used by the suffix-swap rule.
_SUFFIX_TOKENS = frozenset(
    {
        "av",
        "ave",
        "avenue",
        "st",
        "street",
        "blvd",
        "boulevard",
        "rd",
        "road",
        "ln",
        "lane",
        "dr",
        "drive",
        "ct",
        "court",
        "pl",
        "place",
        "ter",
        "terrace",
        "way",
        "hwy",
        "highway",
        "pkwy",
        "parkway",
    }
)


def _str(value: object) -> str | None:
    """Coerce a field value to ``str | None``, treating empties as None."""
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, str):
        s = value.strip()
        return s or None
    return str(value)


def _normalize_address(addr: str) -> str:
    return " ".join(addr.lower().split())


def _split_address_tokens(addr: str) -> tuple[str | None, list[str], str | None]:
    """Return ``(leading_number, middle_tokens, trailing_suffix)``.

    Suffix is set only when the last token is a known street-type token; the
    leading number is set only when the first token is purely numeric.
    """
    tokens = _normalize_address(addr).split()
    if not tokens:
        return None, [], None
    number = tokens[0] if tokens[0].isdigit() else None
    middle_start = 1 if number is not None else 0
    suffix = (
        tokens[-1]
        if len(tokens) > middle_start and tokens[-1] in _SUFFIX_TOKENS
        else None
    )
    middle_end = len(tokens) - (1 if suffix is not None else 0)
    middle = tokens[middle_start:middle_end]
    return number, middle, suffix


def _parse_us_date(value: str) -> datetime | None:
    parts = value.split("/")
    if len(parts) == 3:
        try:
            m, d, y = (int(p) for p in parts)
            return datetime(y, m, d)
        except ValueError:
            return None
    return None


# ----- rules ---------------------------------------------------------------


def rule_missing_block_lot(fields: ExtractedFields, _: Gazetteer) -> list[Issue]:
    if _str(fields.get(BLOCK_LOT_FIELD)) is None:
        return [
            Issue(
                kind="missing_block_lot",
                severity="minor",
                field=BLOCK_LOT_FIELD,
                value=None,
                message="Block & Lot is empty.",
                source="rule",
            )
        ]
    return []


def rule_missing_description(fields: ExtractedFields, _: Gazetteer) -> list[Issue]:
    parts = [_str(fields.get(f)) for f in DESCRIPTION_FIELDS]
    if all(p is None for p in parts):
        return [
            Issue(
                kind="missing_description",
                severity="minor",
                field=DESCRIPTION_FIELDS[0],
                value=None,
                message="Description fields are all empty.",
                source="rule",
            )
        ]
    return []


def rule_missing_street_number(fields: ExtractedFields, _: Gazetteer) -> list[Issue]:
    addr = _str(fields.get(ADDRESS_FIELD))
    if addr is None:
        return []
    if not _LEADING_NUMBER_RE.match(addr):
        return [
            Issue(
                kind="missing_street_number",
                severity="minor",
                field=ADDRESS_FIELD,
                value=addr,
                message="Street address is missing a leading number.",
                source="rule",
            )
        ]
    return []


def rule_missing_form_checkbox(fields: ExtractedFields, _: Gazetteer) -> list[Issue]:
    if not any(fields.get(f) is True for f in FORM_CHECKBOX_FIELDS):
        return [
            Issue(
                kind="missing_form_checkbox",
                severity="minor",
                field=FORM_CHECKBOX_FIELDS[0],
                value=None,
                message="Neither Form 3 nor Form 8 checkbox is selected.",
                source="rule",
            )
        ]
    return []


def rule_block_lot_format(fields: ExtractedFields, _: Gazetteer) -> list[Issue]:
    value = _str(fields.get(BLOCK_LOT_FIELD))
    if value is None:
        return []  # suppressed: handled by missing_block_lot
    if _BLOCK_LOT_RE.match(value):
        return []
    return [
        Issue(
            kind="block_lot_format",
            severity="minor",
            field=BLOCK_LOT_FIELD,
            value=value,
            message="Block & Lot does not match required NNNN/NNN format.",
            source="rule",
        )
    ]


def rule_license_digit_drop(fields: ExtractedFields, _: Gazetteer) -> list[Issue]:
    value = _str(fields.get(LICENSE_FIELD))
    if value is None:
        return []
    digits = "".join(c for c in value if c.isdigit())
    if not digits or len(digits) in _LICENSE_OK_LEN:
        return []
    return [
        Issue(
            kind="license_digit_drop",
            severity="minor",
            field=LICENSE_FIELD,
            value=value,
            message=(
                f"Contractor license has {len(digits)} digits; expected 6-8 "
                "(possible digit drop)."
            ),
            source="rule",
        )
    ]


def rule_date_impossibility_swap(fields: ExtractedFields, _: Gazetteer) -> list[Issue]:
    filed = _str(fields.get(DATE_FILED_FIELD))
    issued = _str(fields.get(ISSUED_FIELD))
    if filed is None or issued is None:
        return []
    filed_dt = _parse_us_date(filed)
    issued_dt = _parse_us_date(issued)
    if filed_dt is None or issued_dt is None:
        return []
    if filed_dt <= issued_dt:
        return []
    return [
        Issue(
            kind="date_impossibility_swap",
            severity="major",
            field=DATE_FILED_FIELD,
            value=filed,
            message=(
                f"DATE FILED ({filed}) is after ISSUED ({issued}); "
                "values may be swapped."
            ),
            source="rule",
        )
    ]


def _resolve_address_issue(canonical: str, extracted: str) -> Issue | None:
    """Pick at most one address issue when block_lot resolves to a canonical.

    Returns ``None`` if extracted normalizes to canonical (no issue).
    Otherwise returns the most specific of: ``street_suffix_swap`` (only suffix
    differs), ``address_typo`` (close fuzzy match), or
    ``address_block_lot_mismatch`` (genuinely different).
    """
    if _normalize_address(canonical) == _normalize_address(extracted):
        return None

    canon_num, canon_mid, canon_suf = _split_address_tokens(canonical)
    ext_num, ext_mid, ext_suf = _split_address_tokens(extracted)
    if (
        canon_num is not None
        and canon_num == ext_num
        and canon_mid == ext_mid
        and canon_suf is not None
        and ext_suf is not None
        and canon_suf != ext_suf
    ):
        return Issue(
            kind="street_suffix_swap",
            severity="minor",
            field=ADDRESS_FIELD,
            value=extracted,
            message=(
                f"Street suffix '{ext_suf}' differs from gazetteer suffix "
                f"'{canon_suf}' for this block/lot."
            ),
            source="rule",
        )

    score = (
        fuzz.WRatio(_normalize_address(canonical), _normalize_address(extracted))
        / 100.0
    )
    if score >= 0.85:
        return Issue(
            kind="address_typo",
            severity="minor",
            field=ADDRESS_FIELD,
            value=extracted,
            message=(
                f"Address differs from gazetteer entry '{canonical}' "
                f"(similarity {score:.2f}); likely a typo."
            ),
            source="rule",
        )
    return Issue(
        kind="address_block_lot_mismatch",
        severity="major",
        field=ADDRESS_FIELD,
        value=extracted,
        message=(
            f"Address '{extracted}' does not match gazetteer address "
            f"'{canonical}' for block/lot."
        ),
        source="rule",
    )


def rule_address_against_gazetteer(
    fields: ExtractedFields, gazetteer: Gazetteer
) -> list[Issue]:
    """Combined gazetteer rule emitting at most one address-related issue.

    Replaces three logical rules (suffix_swap, typo, block_lot_mismatch) so
    they cannot double-fire on the same address.
    """
    block_lot = _str(fields.get(BLOCK_LOT_FIELD))
    addr = _str(fields.get(ADDRESS_FIELD))
    if block_lot is None or addr is None:
        return []
    canonical = gazetteer.lookup_address(block_lot)
    if canonical is None:
        return []
    issue = _resolve_address_issue(canonical, addr)
    return [issue] if issue is not None else []


RULES: list[Rule] = [
    rule_missing_block_lot,
    rule_missing_description,
    rule_missing_street_number,
    rule_missing_form_checkbox,
    rule_block_lot_format,
    rule_license_digit_drop,
    rule_date_impossibility_swap,
    rule_address_against_gazetteer,
]


def run_rules(fields: ExtractedFields, gazetteer: Gazetteer) -> list[Issue]:
    """Run every rule in registry order; return issues in emission order."""
    issues: list[Issue] = []
    for rule in RULES:
        issues.extend(rule(fields, gazetteer))
    return issues
