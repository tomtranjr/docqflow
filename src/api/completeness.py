"""Required-field policy for Form 3-8 review readiness.

Lives server-side because the rule is a business policy that the SF DBI revises
periodically. Audit trails and notification messages both consume the same
output, so the rule must have a single source of truth.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass

REQUIRED_FIELDS: tuple[str, ...] = (
    "application_number",
    "project_address",
    "parcel_number",
    "estimated_cost",
    "contractor_name",
    "license_number",
)


@dataclass(frozen=True)
class CompletenessResult:
    passed: bool
    missing: list[str]


def evaluate(fields: Mapping[str, object]) -> CompletenessResult:
    """Return a :class:`CompletenessResult` for the supplied field map.

    Treats missing keys, ``None``, and empty strings as missing.
    The ``missing`` list preserves the canonical order in :data:`REQUIRED_FIELDS`.
    """
    missing = [name for name in REQUIRED_FIELDS if not fields.get(name)]
    return CompletenessResult(passed=not missing, missing=missing)
