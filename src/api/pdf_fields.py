"""Deterministic AcroForm field extraction for SF DBI Form 3-8.

Form 3-8 (Application for Building Permit Additions, Alterations, or Repairs)
exposes ~97 named widgets through PyMuPDF. We map a curated subset to friendly
keys consumed by the review UI. Blank widgets become None so the UI can render
the "MISSING" treatment.

If a PDF has no AcroForm at all (typical for non-permit uploads), every key
resolves to None — the binary classifier has already labelled the doc
"not-permit-3-8" so the UI never asks for fields anyway.
"""
from __future__ import annotations

import logging
from typing import Any

import fitz

logger = logging.getLogger(__name__)

# Friendly key -> ordered tuple of widget names whose first non-empty value wins.
_FIELD_MAP: dict[str, tuple[str, ...]] = {
    "application_number": ("APPLICATION NUMBER",),
    "date_filed": ("DATE FILED",),
    "project_address": ("1 STREET ADDRESS OF JOB BLOCK  LOT",),
    "parcel_number": ("1 BLOCK & LOT",),
    "estimated_cost": ("2A ESTIMATED COST OF JOB",),
    "stories": ("5 NO OF STORIES OF OCCUPANCY", "5A NO OF STORIES OF OCCUPANCY"),
    "dwelling_units": ("9 NO OF DWELLING UNITS", "9A NO OF DWELLING UNITS"),
    "proposed_use": ("7 PROPOSED USE LEGAL USE", "7A PRESENT USE"),
    "occupancy_class": ("8 0CCUP CLASS", "8A 0CCUP CLASS"),
    "construction_type": ("4 TYPE OF CONSTR", "4A TYPE OF CONSTR"),
    "contractor_name": ("14 CONTRACTOR",),
    "contractor_address": ("14A CONTRACTOR ADDRESS",),
    "license_number": ("14C CSLB",),
    "owner_name": ("15 OWNER  LESSEE",),
}

_DESCRIPTION_FIELDS: tuple[str, ...] = (
    "16 DESCRIPTION",
    "16A DESCRIPTION",
    "16B DESCRIPTION",
    "16C DESCRIPTION",
    "16D DESCRIPTION",
)

# Sentinel widget names that confirm we're looking at a 2020-04-07 Form 3-8.
_FORM_VERSION_MARKERS: tuple[str, ...] = (
    "APPLICATION NUMBER",
    "1 BLOCK & LOT",
    "14 CONTRACTOR",
)

FRIENDLY_KEYS: tuple[str, ...] = (*_FIELD_MAP.keys(), "description")


def _read_widgets(pdf_bytes: bytes) -> dict[str, str]:
    """Return {widget_name: first_non_empty_value} from every page."""
    values: dict[str, str] = {}
    with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
        for page in doc:
            for widget in page.widgets() or []:
                if widget.field_type_string != "Text":
                    continue
                name = (widget.field_name or "").strip()
                value = (widget.field_value or "").strip()
                if name and value and name not in values:
                    values[name] = value
    return values


def extract_form_3_8_fields(pdf_bytes: bytes) -> dict[str, Any]:
    """Extract friendly-keyed fields from a Form 3-8 PDF.

    Returns a dict with every key in :data:`FRIENDLY_KEYS`. Missing values are None.
    Logs a warning when a PDF has widget data but none of the sentinel widget
    names match — likely a future Form 3-8 revision with renamed widgets.
    """
    raw = _read_widgets(pdf_bytes)

    if raw and not any(marker in raw for marker in _FORM_VERSION_MARKERS):
        logger.warning(
            "Form 3-8 sentinel widgets missing; AcroForm names may have changed",
            extra={"widget_count": len(raw)},
        )

    extracted: dict[str, Any] = {}
    for friendly, candidates in _FIELD_MAP.items():
        value: str | None = None
        for widget_name in candidates:
            candidate_value = raw.get(widget_name)
            if candidate_value:
                value = candidate_value
                break
        extracted[friendly] = value

    description_parts = [raw.get(name, "").strip() for name in _DESCRIPTION_FIELDS]
    description = " ".join(part for part in description_parts if part).strip()
    extracted["description"] = description or None

    return extracted
