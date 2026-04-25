"""
Generate filled Form 3-8 PDFs from SF Data Portal permit data.

Pulls permit records from the SODA API, scrapes contractor details from the
DBI Permit Tracking site, and fills the Form 3-8 fillable PDF template.

Usage:
    # Generate 10 permits (default)
    python generate_permits.py

    # Generate 20 permits, skip DBI scraping
    python generate_permits.py -n 20 --skip-scrape
"""

import argparse
import logging
import re
import time
from pathlib import Path

import requests
from pypdf import PdfReader, PdfWriter

logger = logging.getLogger(__name__)

SODA_ENDPOINT = "https://data.sfgov.org/resource/i98e-djp9.json"
DBI_BASE = "https://dbiweb02.sfgov.org/dbipts"
DEFAULT_TEMPLATE = "data/permit-3-8/Form-3-8-Fillable-2020-04-07-FINAL_AxgX5Eg.pdf"
DEFAULT_OUTPUT_DIR = "data/permit-3-8"

SODA_FIELDS = [
    "permit_number",
    "permit_type",
    "filed_date",
    "issued_date",
    "block",
    "lot",
    "street_number",
    "street_name",
    "street_suffix",
    "unit",
    "description",
    "estimated_cost",
    "revised_cost",
    "existing_use",
    "proposed_use",
    "number_of_existing_stories",
    "number_of_proposed_stories",
    "existing_construction_type",
    "proposed_construction_type",
    "existing_occupancy",
    "proposed_occupancy",
    "plansets",
    "existing_units",
    "proposed_units",
]


def count_existing_permits(output_dir: str) -> int:
    """Count already-generated permit PDFs in the output directory."""
    return len(list(Path(output_dir).glob("permit_*.pdf")))


def fetch_permits(count: int, offset: int = 0) -> list[dict]:
    """Fetch permit records from the SODA API.

    Args:
        count: Number of permits desired.
        offset: Number of records to skip (for pagination).

    Returns:
        List of permit record dicts from the API.
    """
    select = ",".join(SODA_FIELDS)
    where = (
        "permit_type in('3','8') AND status in('issued','complete') "
        "AND issued_date IS NOT NULL"
    )

    params = {
        "$select": select,
        "$where": where,
        "$order": "issued_date DESC",
        "$limit": count * 2,
        "$offset": offset,
    }

    for attempt in range(3):
        try:
            resp = requests.get(SODA_ENDPOINT, params=params, timeout=30)
            resp.raise_for_status()
            records = resp.json()
            logger.info("Fetched %d records from SODA API", len(records))
            return records
        except requests.RequestException as e:
            logger.warning("SODA API attempt %d failed: %s", attempt + 1, e)
            if attempt < 2:
                time.sleep(2**attempt)
    logger.error("SODA API failed after 3 attempts")
    return []


def scrape_contractor(session: requests.Session, permit_number: str) -> dict | None:
    """Scrape contractor details from the DBI Permit Tracking site.

    Uses a 3-step ASP.NET WebForms flow:
    1. GET the search page to obtain ViewState tokens
    2. POST the permit number to the form handler
    3. GET the permit details page

    Args:
        session: requests.Session with persistent cookies.
        permit_number: The permit application number to look up.

    Returns:
        Dict with contractor fields, or None on failure.
    """
    try:
        # Step 1: GET search page, extract ViewState
        r1 = session.get(f"{DBI_BASE}/default.aspx?page=PermitType", timeout=15)
        r1.raise_for_status()

        vs = re.search(r'__VIEWSTATE.*?value="(.*?)"', r1.text)
        vsg = re.search(r'__VIEWSTATEGENERATOR.*?value="(.*?)"', r1.text)
        ev = re.search(r'__EVENTVALIDATION.*?value="(.*?)"', r1.text)
        if not (vs and vsg and ev):
            logger.warning("Could not extract ViewState for %s", permit_number)
            return None

        # Step 2: POST permit number search
        form_data = {
            "__VIEWSTATE": vs.group(1),
            "__VIEWSTATEGENERATOR": vsg.group(1),
            "__EVENTVALIDATION": ev.group(1),
            "InfoReq1$optPermitTypes": "Building",
            "InfoReq1$txtPermitComplaintNumber": permit_number,
            "InfoReq1$cmdContinue": "Continue",
        }
        session.post(
            f"{DBI_BASE}/Default2.aspx?page=PermitType",
            data=form_data,
            timeout=15,
            allow_redirects=True,
        )

        # Step 3: GET permit details
        r3 = session.get(f"{DBI_BASE}/default.aspx?page=PermitDetails", timeout=15)
        if r3.status_code != 200:
            logger.warning(
                "DBI details page returned %d for %s", r3.status_code, permit_number
            )
            return None

        # Parse contractor spans
        contractor = {}
        span_map = {
            "InfoReq1_lblLicNo": "license_number",
            "InfoReq1_lblContractorName": "contractor_name",
            "InfoReq1_lblCompanyName": "company_name",
            "InfoReq1_lblContractorAddr": "contractor_address",
            "InfoReq1_lblPhone": "contractor_phone",
        }
        for span_id, key in span_map.items():
            match = re.search(rf'id="{span_id}"[^>]*>(.*?)</span>', r3.text, re.DOTALL)
            if match:
                value = re.sub(r"<[^>]+>", "", match.group(1)).strip()
                if value:
                    contractor[key] = value

        return contractor if contractor else None

    except requests.RequestException as e:
        logger.warning("DBI scrape failed for %s: %s", permit_number, e)
        return None


def format_date(iso_string: str) -> str:
    """Convert ISO date string to M/D/YYYY format."""
    if not iso_string:
        return ""
    match = re.match(r"(\d{4})-(\d{2})-(\d{2})", iso_string)
    if not match:
        return iso_string
    year, month, day = match.groups()
    return f"{int(month)}/{int(day)}/{year}"


def format_cost(cost_string: str) -> str:
    """Convert cost float string to $XX,XXX format."""
    if not cost_string:
        return ""
    try:
        cost = float(cost_string)
        return f"${cost:,.0f}"
    except ValueError:
        return cost_string


def format_units(units_string: str) -> str:
    """Convert units float string to integer string."""
    if not units_string:
        return ""
    try:
        return str(int(float(units_string)))
    except ValueError:
        return units_string


def split_description(text: str, line_length: int = 80) -> list[str]:
    """Split description text into lines that fit the PDF fields.

    Breaks on word boundaries across up to 5 lines (fields 16, 16A-D).
    """
    if not text:
        return [""]
    words = text.split()
    lines = []
    current = ""
    for word in words:
        if current and len(current) + 1 + len(word) > line_length:
            lines.append(current)
            current = word
        else:
            current = f"{current} {word}".strip()
    if current:
        lines.append(current)
    return lines[:5] if lines else [""]


def map_to_fields(record: dict, contractor: dict | None) -> dict:
    """Map SODA API record and contractor info to PDF form field names.

    Args:
        record: Dict from the SODA API response.
        contractor: Dict from DBI scrape, or None.

    Returns:
        Dict mapping exact PDF field names to string values.
    """
    fields = {}

    # Form type checkbox: Check Box8 = Form 3, Check Box9 = Form 8
    permit_type = record.get("permit_type", "")
    if permit_type == "3":
        fields["Check Box8"] = "/Yes"
    elif permit_type == "8":
        fields["Check Box9"] = "/Yes"

    # Core permit info
    fields["APPLICATION NUMBER"] = record.get("permit_number", "")
    fields["DATE FILED"] = format_date(record.get("filed_date", ""))
    fields["ISSUED"] = format_date(record.get("issued_date", ""))

    # Address
    parts = [
        record.get("street_number", ""),
        record.get("street_name", ""),
        record.get("street_suffix", ""),
    ]
    if record.get("unit"):
        parts.append(f"#{record['unit']}")
    fields["1 STREET ADDRESS OF JOB BLOCK  LOT"] = " ".join(p for p in parts if p)

    block = record.get("block", "")
    lot = record.get("lot", "")
    fields["1 BLOCK & LOT"] = f"{block}/{lot}" if block or lot else ""

    # Cost
    cost = record.get("revised_cost") or record.get("estimated_cost", "")
    fields["2A ESTIMATED COST OF JOB"] = format_cost(cost)

    fields["NUMBER OF PLAN SETS"] = record.get("plansets", "")

    # Existing vs proposed (paired fields)
    fields["4A TYPE OF CONSTR"] = record.get("existing_construction_type", "")
    fields["4 TYPE OF CONSTR"] = record.get("proposed_construction_type", "")
    fields["5A NO OF STORIES OF OCCUPANCY"] = record.get(
        "number_of_existing_stories", ""
    )
    fields["5 NO OF STORIES OF OCCUPANCY"] = record.get(
        "number_of_proposed_stories", ""
    )
    fields["7A PRESENT USE"] = record.get("existing_use", "")
    fields["7 PROPOSED USE LEGAL USE"] = record.get("proposed_use", "")
    fields["8A 0CCUP CLASS"] = record.get("existing_occupancy", "")
    fields["8 0CCUP CLASS"] = record.get("proposed_occupancy", "")
    fields["9A NO OF DWELLING UNITS"] = format_units(record.get("existing_units", ""))
    fields["9 NO OF DWELLING UNITS"] = format_units(record.get("proposed_units", ""))

    # Description (split across 5 lines)
    desc_lines = split_description(record.get("description", ""))
    desc_fields = [
        "16 DESCRIPTION",
        "16A DESCRIPTION",
        "16B DESCRIPTION",
        "16C DESCRIPTION",
        "16D DESCRIPTION",
    ]
    for i, field_name in enumerate(desc_fields):
        fields[field_name] = desc_lines[i] if i < len(desc_lines) else ""

    # Contractor info (from DBI scrape)
    if contractor:
        name = contractor.get("contractor_name", "")
        company = contractor.get("company_name", "")
        if name and company and name != company:
            fields["14 CONTRACTOR"] = f"{name} / {company}"
        else:
            fields["14 CONTRACTOR"] = name or company
        fields["14A CONTRACTOR ADDRESS"] = contractor.get("contractor_address", "")
        fields["14B CONTRACTOR PHONE"] = contractor.get("contractor_phone", "")
        fields["14C CSLB"] = contractor.get("license_number", "")

    return fields


def fill_pdf(template_path: str, output_path: str, field_data: dict) -> bool:
    """Fill the PDF template with field data and save.

    Args:
        template_path: Path to the fillable PDF template.
        output_path: Where to write the filled PDF.
        field_data: Dict mapping field names to string values.

    Returns:
        True on success, False on failure.
    """
    try:
        reader = PdfReader(template_path)
        writer = PdfWriter()
        writer.append(reader)
        writer.update_page_form_field_values(writer.pages[0], field_data)

        with open(output_path, "wb") as f:
            writer.write(f)
        return True
    except Exception as e:
        logger.error("PDF fill failed for %s: %s", output_path, e)
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Generate filled Form 3-8 PDFs from SF Data Portal permit data"
    )
    parser.add_argument(
        "-n",
        "--count",
        type=int,
        default=10,
        help="Number of PDFs to generate (default: 10)",
    )
    parser.add_argument(
        "--output-dir",
        default=DEFAULT_OUTPUT_DIR,
        help=f"Output directory (default: {DEFAULT_OUTPUT_DIR})",
    )
    parser.add_argument(
        "--template",
        default=DEFAULT_TEMPLATE,
        help=f"Path to fillable PDF template (default: {DEFAULT_TEMPLATE})",
    )
    parser.add_argument(
        "--skip-scrape",
        action="store_true",
        help="Skip DBI scraping, use only SODA API data",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=3.0,
        help="Delay in seconds between DBI requests (default: 3.0)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s: %(message)s",
    )

    template = Path(args.template)
    if not template.exists():
        logger.error("Template not found: %s", template)
        return

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Use existing permit count as offset for pagination
    existing_count = count_existing_permits(args.output_dir)
    if existing_count:
        logger.info(
            "Found %d existing permits, offsetting to fetch next batch", existing_count
        )

    # Fetch permits from SODA API
    records = fetch_permits(args.count, offset=existing_count)
    if not records:
        logger.error("No records fetched from SODA API")
        return

    # Filter records with missing critical fields
    valid = [r for r in records if r.get("permit_number") and r.get("street_number")]
    logger.info("Got %d valid records (of %d fetched)", len(valid), len(records))

    # Set up DBI scraping session
    session = requests.Session() if not args.skip_scrape else None

    generated = 0
    skipped = 0

    for i, record in enumerate(valid):
        if generated >= args.count:
            break

        permit_num = record["permit_number"]
        output_path = output_dir / f"permit_{permit_num}.pdf"

        # Scrape contractor info
        contractor = None
        if session:
            logger.debug("Scraping contractor for %s", permit_num)
            contractor = scrape_contractor(session, permit_num)
            if contractor:
                logger.debug(
                    "Got contractor: %s", contractor.get("contractor_name", "")
                )
            if i < len(valid) - 1:
                time.sleep(args.delay)

        # Map data to PDF fields
        field_data = map_to_fields(record, contractor)

        # Fill and save PDF
        if fill_pdf(str(template), str(output_path), field_data):
            generated += 1
            print(f"[{generated}/{args.count}] Generated {output_path.name}")
        else:
            skipped += 1

    print(f"\nDone. Generated {generated} permits ({skipped} skipped due to errors)")


if __name__ == "__main__":
    main()
