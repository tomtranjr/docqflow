from pathlib import Path

from src.api.pdf_fields import extract_form_3_8_fields

DATA = Path(__file__).resolve().parents[2] / "data"


def test_filled_form_extracts_friendly_keys():
    pdf_bytes = (DATA / "permit-3-8" / "permit_202604089128.pdf").read_bytes()
    fields = extract_form_3_8_fields(pdf_bytes)
    assert fields["application_number"] == "202604089128"
    assert fields["date_filed"] == "4/8/2026"
    assert fields["project_address"] == "2130 Harrison St #9"
    assert fields["parcel_number"] == "3573/056"
    assert fields["estimated_cost"] == "$29,100"
    assert fields["contractor_name"] == "EGOR UDOVENKO / MINT CONSTRUCTION INC"
    assert fields["license_number"] == "1143205"
    assert fields["dwelling_units"] == "26"


def test_blank_template_returns_none_for_text_fields():
    pdf_bytes = (
        DATA / "permit-3-8" / "Form-3-8-Fillable-2020-04-07-FINAL_AxgX5Eg.pdf"
    ).read_bytes()
    fields = extract_form_3_8_fields(pdf_bytes)
    assert fields["application_number"] is None
    assert fields["project_address"] is None


def test_non_form_pdf_returns_all_none():
    pdf_bytes = (
        DATA / "not-permit-3-8" / "MSDS Academic Plan Summer 2025.pdf"
    ).read_bytes()
    fields = extract_form_3_8_fields(pdf_bytes)
    assert all(v is None for v in fields.values())


def test_description_concatenates_continuation_widgets():
    pdf_bytes = (DATA / "permit-3-8" / "permit_202604089128.pdf").read_bytes()
    fields = extract_form_3_8_fields(pdf_bytes)
    assert "remodel existing bathroom" in fields["description"]
    assert "minot electrical" in fields["description"]
    assert "proofing" in fields["description"]
