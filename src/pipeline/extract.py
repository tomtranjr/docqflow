"""Stage 4: AcroForm field extraction.

Reads the 87 named fields off a fillable San Francisco permit PDF and returns
them as an `ExtractedFields` mapping. Field names are preserved as-is —
including embedded spaces, ampersands, and known typos like ``'8A 0CCUP CLASS'``
— because every downstream Stage 5 / Stage 6 rule references them verbatim.

OCR is explicitly out of scope; flat (non-fillable) PDFs raise
:class:`NotAnAcroForm` so the API layer can return a clean 422.
"""

from __future__ import annotations

import io
import logging
from typing import Any, Final

import pypdf

from src.pipeline.schemas import ExtractedFields

log = logging.getLogger(__name__)

_BTN_TRUTHY: Final = frozenset({"/Yes", "/On", "Yes", "On"})
_BTN_FALSY: Final = frozenset({"/Off", "/No", "Off", "No"})


class NotAnAcroForm(ValueError):
    """Raised when a PDF has no AcroForm fields (e.g. scanned or flattened)."""


def _normalize_button(value: Any) -> bool | None:
    """Map a button/checkbox ``/V`` to ``True | False | None``.

    pypdf returns ``None`` when a button field has no ``/V`` entry at all,
    which is common for unchecked checkboxes in this form. We surface that as
    ``None`` instead of guessing ``False`` so callers can distinguish
    "explicitly off" from "form left it blank".
    """
    if value is None:
        return None
    s = str(value)
    if s in _BTN_TRUTHY:
        return True
    if s in _BTN_FALSY:
        return False
    return None


def read_acroform(pdf_bytes: bytes) -> ExtractedFields:
    """Read AcroForm field values from a permit PDF.

    Args:
        pdf_bytes: Raw PDF content.

    Returns:
        Mapping from field name (verbatim) to ``str | bool | None``. Text
        fields keep their original string value (including empty strings and
        embedded whitespace). Button fields are normalized to ``True``,
        ``False``, or ``None``. Signature (``/Sig``) fields are skipped.

    Raises:
        NotAnAcroForm: if the PDF has no fillable form fields.
    """
    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    fields = reader.get_fields()
    if not fields:
        raise NotAnAcroForm("PDF has no AcroForm fields")

    out: ExtractedFields = {}
    for name, fld in fields.items():
        ft = fld.get("/FT")
        value = fld.get("/V")
        if ft == "/Sig":
            continue
        if ft == "/Btn":
            out[name] = _normalize_button(value)
        else:
            out[name] = None if value is None else str(value)
    return out
