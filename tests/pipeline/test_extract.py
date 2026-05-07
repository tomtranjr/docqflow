"""Tests for Stage 4 AcroForm extraction.

Uses real fillable PDFs from ``data/permit-3-8/`` and a runtime-generated flat
PDF (template with ``/AcroForm`` stripped) for the negative path. The flat
fixture is built in-memory so we don't commit a binary just to fail one test.
"""

from __future__ import annotations

import io
from pathlib import Path

import pypdf
import pytest

from src.pipeline.extract import NotAnAcroForm, read_acroform

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "data" / "permit-3-8"
SAMPLE_PDF = DATA_DIR / "permit-3-8_correct_202604240099.pdf"
TEMPLATE_PDF = DATA_DIR / "Form-3-8-Fillable-2020-04-07-FINAL_AxgX5Eg.pdf"


pytestmark = pytest.mark.skipif(
    not (SAMPLE_PDF.exists() and TEMPLATE_PDF.exists()),
    reason="permit-3-8 fixtures not present (data/ is gitignored)",
)


@pytest.fixture
def sample_bytes() -> bytes:
    return SAMPLE_PDF.read_bytes()


@pytest.fixture
def template_bytes() -> bytes:
    return TEMPLATE_PDF.read_bytes()


@pytest.fixture
def flat_pdf_bytes(template_bytes: bytes) -> bytes:
    """Re-save the template with the ``/AcroForm`` dictionary stripped.

    Produces a structurally valid PDF that pypdf can open but whose
    ``get_fields()`` returns nothing — exactly what an OCR-only or flattened
    permit upload would look like to the extractor.
    """
    reader = pypdf.PdfReader(io.BytesIO(template_bytes))
    writer = pypdf.PdfWriter(clone_from=reader)
    writer._root_object.pop("/AcroForm", None)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def test_full_read_returns_known_field_values(sample_bytes: bytes) -> None:
    fields = read_acroform(sample_bytes)

    assert fields["APPLICATION NUMBER"] == "202604240099"
    assert fields["1 BLOCK & LOT"] == "1428/017"
    assert fields["1 STREET ADDRESS OF JOB BLOCK  LOT"] == "277 05th Av"
    assert fields["2A ESTIMATED COST OF JOB"] == "$1"
    assert fields["7A PRESENT USE"] == "apartments"
    assert fields["DATE FILED"] == "4/24/2026"
    assert fields["ISSUED"] == "4/24/2026"


def test_typo_field_name_preserved_verbatim(sample_bytes: bytes) -> None:
    fields = read_acroform(sample_bytes)

    assert "8A 0CCUP CLASS" in fields
    assert fields["8A 0CCUP CLASS"] == "R-2"
    assert "8A OCCUP CLASS" not in fields


def test_missing_optional_field_is_none(sample_bytes: bytes) -> None:
    fields = read_acroform(sample_bytes)

    assert fields["FILING FEE RECEIPT NO"] is None
    assert fields["RECEIPT NO"] is None


def test_button_checked_vs_unchecked(sample_bytes: bytes) -> None:
    fields = read_acroform(sample_bytes)

    assert fields["Check Box9"] is True
    assert fields["Check Box8"] in (False, None)

    button_values = {
        v
        for k, v in fields.items()
        if k.startswith("Check Box") or k.startswith("undefined_")
    }
    assert button_values <= {True, False, None}


def test_signature_fields_skipped(sample_bytes: bytes) -> None:
    fields = read_acroform(sample_bytes)

    assert "Signature of Applicant or Agent" not in fields


def test_template_returns_field_set(template_bytes: bytes) -> None:
    fields = read_acroform(template_bytes)

    assert len(fields) > 0
    assert "1 BLOCK & LOT" in fields
    assert "APPLICATION NUMBER" in fields
    assert "8A 0CCUP CLASS" in fields


def test_flat_pdf_raises_not_an_acroform(flat_pdf_bytes: bytes) -> None:
    with pytest.raises(NotAnAcroForm):
        read_acroform(flat_pdf_bytes)
