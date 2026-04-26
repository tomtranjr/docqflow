"""
Generate filled Form 3-8 PDFs from SF Data Portal permit data.

One-shot training-data generator for the validation/reasoning pipeline.
Produces three flavors of PDFs in a single batch:

    correct   — ground-truth, properly filled
    minor     — N single-field mutations (1..MAX_MINOR_MUTATIONS), e.g. address typo
    major     — one cross-field contradiction sampled from 4 types: description
                vs. permit type, cost vs. scope, date impossibility, address vs. block/lot

Filenames encode the flavor and mutation count:

    permit-3-8_correct_<permit_number>.pdf
    permit-3-8_minor-2_<permit_number>.pdf
    permit-3-8_major-1_<permit_number>.pdf

Usage:
    # Default 50 correct / 30 minor / 20 major
    python generate_permits.py

    # Smoke run, no DBI scraping
    python generate_permits.py --reset --correct 4 --minor 3 --major 3 --skip-scrape
"""

import argparse
import hashlib
import json
import logging
import random
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader, PdfWriter

logger = logging.getLogger(__name__)

SODA_ENDPOINT = "https://data.sfgov.org/resource/i98e-djp9.json"
DBI_BASE = "https://dbiweb02.sfgov.org/dbipts"
DEFAULT_TEMPLATE = "data/permit-3-8/Form-3-8-Fillable-2020-04-07-FINAL_AxgX5Eg.pdf"
DEFAULT_OUTPUT_DIR = "data/permit-3-8"
MANIFEST_FILE = ".manifest.json"
LABELS_FILE = "labels.json"
MAX_MINOR_MUTATIONS = 3

DESCRIPTION_FIELDS = [
    "16 DESCRIPTION",
    "16A DESCRIPTION",
    "16B DESCRIPTION",
    "16C DESCRIPTION",
    "16D DESCRIPTION",
]

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

# Hardcoded mismatched descriptions for major-error PDFs.
# Form 3 = new construction; Form 8 = OTC alterations/repairs.
# Form 8 phrasing on a Form 3 record (and vice versa) is a clear semantic mismatch.
MAJOR_DESCRIPTION_BANK = {
    "form_8_phrasing": [
        "Replace existing water heater in kitchen, like for like.",
        "Repair dry rot on rear deck, no structural changes.",
        "Replace 4 windows on second floor, same size and location.",
        "Reroof existing single-family dwelling, tear off and replace.",
        "Replace kitchen cabinets and countertops, no plumbing changes.",
    ],
    "form_3_phrasing": [
        "New construction of 4-story mixed-use building with 12 dwelling units.",
        "Erect new 3-story single-family dwelling on vacant lot.",
        "Construct new 2-story commercial building with ground floor retail.",
        "New 5-unit apartment building with subterranean parking garage.",
        "Build new detached accessory dwelling unit at rear of lot.",
    ],
}


# ---------------------------------------------------------------------------
# SODA API + DBI scraping
# ---------------------------------------------------------------------------


def fetch_permits(
    count: int, offset: int = 0, permit_types: tuple[str, ...] = ("3", "8")
) -> list[dict]:
    """Fetch permit records from the SODA API.

    Args:
        count: Number of permits desired.
        offset: Number of records to skip (for pagination).
        permit_types: Which permit_type values to filter on.

    Returns:
        List of permit record dicts from the API.
    """
    select = ",".join(SODA_FIELDS)
    type_list = ",".join(f"'{t}'" for t in permit_types)
    where = (
        f"permit_type in({type_list}) AND status in('issued','complete') "
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

    3-step ASP.NET WebForms flow: GET search page (extract ViewState),
    POST permit number, GET details page.
    """
    try:
        r1 = session.get(f"{DBI_BASE}/default.aspx?page=PermitType", timeout=15)
        r1.raise_for_status()

        search_soup = BeautifulSoup(r1.text, "html.parser")
        viewstate_fields = ("__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION")
        viewstate = {}
        for name in viewstate_fields:
            tag = search_soup.find("input", {"name": name})
            if tag is None or not tag.get("value"):
                logger.warning("Could not extract %s for %s", name, permit_number)
                return None
            viewstate[name] = tag["value"]

        form_data = {
            **viewstate,
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

        r3 = session.get(f"{DBI_BASE}/default.aspx?page=PermitDetails", timeout=15)
        if r3.status_code != 200:
            logger.warning(
                "DBI details page returned %d for %s", r3.status_code, permit_number
            )
            return None

        details_soup = BeautifulSoup(r3.text, "html.parser")
        span_map = {
            "InfoReq1_lblLicNo": "license_number",
            "InfoReq1_lblContractorName": "contractor_name",
            "InfoReq1_lblCompanyName": "company_name",
            "InfoReq1_lblContractorAddr": "contractor_address",
            "InfoReq1_lblPhone": "contractor_phone",
        }
        contractor = {}
        for span_id, key in span_map.items():
            tag = details_soup.find(id=span_id)
            if tag is None:
                continue
            value = tag.get_text(strip=True)
            if value:
                contractor[key] = value

        return contractor if contractor else None

    except requests.RequestException as e:
        logger.warning("DBI scrape failed for %s: %s", permit_number, e)
        return None


# ---------------------------------------------------------------------------
# Field formatting & mapping (correct path)
# ---------------------------------------------------------------------------


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
    """Split description text into lines that fit the PDF fields (16, 16A-D)."""
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
    """Map SODA API record and contractor info to PDF form field names."""
    fields = {}

    permit_type = record.get("permit_type", "")
    if permit_type == "3":
        fields["Check Box8"] = "/Yes"
    elif permit_type == "8":
        fields["Check Box9"] = "/Yes"

    fields["APPLICATION NUMBER"] = record.get("permit_number", "")
    fields["DATE FILED"] = format_date(record.get("filed_date", ""))
    fields["ISSUED"] = format_date(record.get("issued_date", ""))

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

    cost = record.get("revised_cost") or record.get("estimated_cost", "")
    fields["2A ESTIMATED COST OF JOB"] = format_cost(cost)

    fields["NUMBER OF PLAN SETS"] = record.get("plansets", "")

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

    desc_lines = split_description(record.get("description", ""))
    for i, field_name in enumerate(DESCRIPTION_FIELDS):
        fields[field_name] = desc_lines[i] if i < len(desc_lines) else ""

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


# ---------------------------------------------------------------------------
# Mutation seam: minor (field-level) and major (semantic) corruptions
# ---------------------------------------------------------------------------


def _seed_for(permit_number: str) -> int:
    """Derive a deterministic seed from a permit number."""
    digest = hashlib.sha256(permit_number.encode()).hexdigest()
    return int(digest, 16)


def _record_change(field: str, before: str, after: str, kind: str) -> dict:
    """Build a mutation record for labels.json."""
    return {"field": field, "before": before, "after": after, "kind": kind}


def _mutate_address_typo(fields: dict, rng: random.Random) -> dict | None:
    """Swap two adjacent letters somewhere in the street address."""
    key = "1 STREET ADDRESS OF JOB BLOCK  LOT"
    val = fields.get(key, "")
    letter_idxs = [i for i, c in enumerate(val) if c.isalpha()]
    if len(letter_idxs) < 4:
        return None
    i = rng.choice(letter_idxs[:-1])
    chars = list(val)
    chars[i], chars[i + 1] = chars[i + 1], chars[i]
    new_val = "".join(chars)
    fields[key] = new_val
    return _record_change(key, val, new_val, "address_typo")


def _mutate_license_digit(fields: dict, rng: random.Random) -> dict | None:
    """Drop one digit from CSLB license number."""
    key = "14C CSLB"
    val = fields.get(key, "")
    digits = [i for i, c in enumerate(val) if c.isdigit()]
    if len(digits) < 4:
        return None
    i = rng.choice(digits)
    new_val = val[:i] + val[i + 1 :]
    fields[key] = new_val
    return _record_change(key, val, new_val, "license_digit_drop")


def _mutate_street_suffix(fields: dict, rng: random.Random) -> dict | None:
    """Swap St <-> Ave in the address line."""
    key = "1 STREET ADDRESS OF JOB BLOCK  LOT"
    val = fields.get(key, "")
    swaps = [(" St ", " Ave "), (" Ave ", " St "), (" St", " Ave"), (" Ave", " St")]
    rng.shuffle(swaps)
    for old, new in swaps:
        if old in val:
            new_val = val.replace(old, new, 1)
            fields[key] = new_val
            return _record_change(key, val, new_val, "street_suffix_swap")
    return None


def _mutate_missing_street_number(fields: dict, rng: random.Random) -> dict | None:
    """Drop the leading street number from the job address."""
    key = "1 STREET ADDRESS OF JOB BLOCK  LOT"
    val = fields.get(key, "")
    parts = val.split(" ", 1)
    if len(parts) < 2 or not parts[0].isdigit():
        return None
    new_val = parts[1]
    fields[key] = new_val
    return _record_change(key, val, new_val, "missing_street_number")


def _mutate_missing_block_lot(fields: dict, rng: random.Random) -> dict | None:
    """Blank out the block & lot field. DBI Section 2 requires this."""
    key = "1 BLOCK & LOT"
    val = fields.get(key, "")
    if not val:
        return None
    fields[key] = ""
    return _record_change(key, val, "", "missing_block_lot")


def _mutate_block_lot_format(fields: dict, rng: random.Random) -> dict | None:
    """Replace the / separator in block/lot with a non-standard one."""
    key = "1 BLOCK & LOT"
    val = fields.get(key, "")
    if "/" not in val:
        return None
    sep = rng.choice(["-", ".", " ", ""])
    new_val = val.replace("/", sep, 1)
    if new_val == val:
        return None
    fields[key] = new_val
    return _record_change(key, val, new_val, "block_lot_format")


def _mutate_missing_form_checkbox(fields: dict, rng: random.Random) -> dict | None:
    """Clear the form-type checkbox at the top of the form (Form 3 or Form 8)."""
    for key in ("Check Box8", "Check Box9"):
        if fields.get(key) == "/Yes":
            del fields[key]
            return _record_change(key, "/Yes", "", "missing_form_checkbox")
    return None


def _mutate_missing_description(fields: dict, rng: random.Random) -> dict | None:
    """Clear all description fields (16, 16A-D)."""
    original = " ".join(fields.get(k, "") for k in DESCRIPTION_FIELDS).strip()
    if not original:
        return None
    for key in DESCRIPTION_FIELDS:
        fields[key] = ""
    return _record_change("16 DESCRIPTION", original, "", "missing_description")


MINOR_MUTATIONS = [
    _mutate_address_typo,
    _mutate_license_digit,
    _mutate_street_suffix,
    _mutate_missing_street_number,
    _mutate_missing_block_lot,
    _mutate_block_lot_format,
    _mutate_missing_form_checkbox,
    _mutate_missing_description,
]


def corrupt_minor(
    fields: dict, permit_number: str, max_n: int
) -> tuple[dict, list[dict]]:
    """Apply 1..max_n field-level mutations deterministically.

    Returns (mutated_fields, mutation_records). Mutations whose target field
    is missing are skipped; the returned list reflects only what actually fired.
    """
    rng = random.Random(_seed_for(permit_number))
    n = rng.randint(1, max_n)
    candidates = MINOR_MUTATIONS.copy()
    rng.shuffle(candidates)

    applied: list[dict] = []
    for mutation in candidates:
        if len(applied) >= n:
            break
        record = mutation(fields, rng)
        if record is not None:
            applied.append(record)

    return fields, applied


def _parse_cost(record: dict) -> float | None:
    """Return numeric cost from a SODA record, or None if unparseable."""
    raw = record.get("revised_cost") or record.get("estimated_cost") or ""
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def _major_description_mismatch(
    record: dict, fields: dict, rng: random.Random, full_pool: list[dict]
) -> dict | None:
    """Replace description with a hardcoded mismatched phrase from MAJOR_DESCRIPTION_BANK."""
    permit_type = record.get("permit_type", "")
    original_desc = record.get("description", "") or ""
    bank_key = "form_8_phrasing" if permit_type == "3" else "form_3_phrasing"
    new_desc = rng.choice(MAJOR_DESCRIPTION_BANK[bank_key])

    desc_lines = split_description(new_desc)
    for i, field_name in enumerate(DESCRIPTION_FIELDS):
        fields[field_name] = desc_lines[i] if i < len(desc_lines) else ""

    return _record_change(
        "description", original_desc, new_desc, f"description_mismatch_bank_{bank_key}"
    )


def _major_cost_scope_mismatch(
    record: dict, fields: dict, rng: random.Random, full_pool: list[dict]
) -> dict | None:
    """Swap cost with one from a record on the opposite side of the cost median.

    Small pools (e.g. <8 records) may yield few candidates on one side of the median.
    """
    own_cost = _parse_cost(record)
    if own_cost is None:
        return None
    own_pn = record.get("permit_number")
    others = sorted(
        (
            (c, r)
            for r in full_pool
            if r.get("permit_number") != own_pn and (c := _parse_cost(r)) is not None
        ),
        key=lambda pair: pair[0],
    )
    if len(others) < 2:
        return None

    median = others[len(others) // 2][0]
    candidates = [r for c, r in others if (c >= median) != (own_cost >= median)]
    if not candidates:
        return None

    new_cost = _parse_cost(rng.choice(candidates))
    if new_cost is None:
        return None

    key = "2A ESTIMATED COST OF JOB"
    before = fields.get(key, "")
    after = format_cost(str(new_cost))
    fields[key] = after
    return _record_change(key, before, after, "cost_scope_mismatch")


def _major_date_impossibility(
    record: dict, fields: dict, rng: random.Random, full_pool: list[dict]
) -> list[dict] | None:
    """Swap DATE FILED and ISSUED so issued precedes filed (logically impossible)."""
    filed_key, issued_key = "DATE FILED", "ISSUED"
    filed_val = fields.get(filed_key, "")
    issued_val = fields.get(issued_key, "")
    if not filed_val or not issued_val or filed_val == issued_val:
        return None
    fields[filed_key] = issued_val
    fields[issued_key] = filed_val
    return [
        _record_change(filed_key, filed_val, issued_val, "date_impossibility_swap"),
        _record_change(issued_key, issued_val, filed_val, "date_impossibility_swap"),
    ]


def _major_address_block_lot_mismatch(
    record: dict, fields: dict, rng: random.Random, full_pool: list[dict]
) -> dict | None:
    """Replace block/lot with values from another record (data-entry copy-paste error)."""
    own_pn = record.get("permit_number")
    candidates = [
        r
        for r in full_pool
        if r.get("permit_number") != own_pn
        and (r.get("block") or r.get("lot"))
        and (r.get("block"), r.get("lot")) != (record.get("block"), record.get("lot"))
    ]
    if not candidates:
        return None
    swap = rng.choice(candidates)
    new_val = f"{swap.get('block', '')}/{swap.get('lot', '')}".strip("/")

    key = "1 BLOCK & LOT"
    before = fields.get(key, "")
    if not new_val or new_val == before:
        return None
    fields[key] = new_val
    return _record_change(key, before, new_val, "address_block_lot_mismatch")


# All major mutations share signature (record, fields, rng, full_pool) for uniform
# dispatch, even when they don't use every argument.
MAJOR_MUTATIONS = [
    _major_description_mismatch,
    _major_cost_scope_mismatch,
    _major_date_impossibility,
    _major_address_block_lot_mismatch,
]


def corrupt_major(
    record: dict, fields: dict, full_pool: list[dict]
) -> tuple[dict, list[dict]]:
    """Apply one major mutation, sampled uniformly across applicable types via deterministic shuffle."""
    rng = random.Random(_seed_for(record.get("permit_number", "")))
    candidates = MAJOR_MUTATIONS.copy()
    rng.shuffle(candidates)
    for mutation in candidates:
        result = mutation(record, fields, rng, full_pool)
        if result:
            return fields, result if isinstance(result, list) else [result]
    logger.warning(
        "All major mutations failed for permit %s; producing major PDF with no mutations.",
        record.get("permit_number", ""),
    )
    return fields, []


# ---------------------------------------------------------------------------
# PDF I/O, manifest, filename
# ---------------------------------------------------------------------------


def fill_pdf(template_path: str, output_path: str, field_data: dict) -> bool:
    """Fill the PDF template with field data and save."""
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


def output_filename(flavor: str, permit_number: str, mutation_count: int = 0) -> str:
    """Return the encoded filename for a generated PDF."""
    if flavor == "correct":
        return f"permit-3-8_correct_{permit_number}.pdf"
    return f"permit-3-8_{flavor}-{mutation_count}_{permit_number}.pdf"


def load_manifest(output_dir: Path) -> set[str]:
    """Load the set of permit numbers already generated."""
    path = output_dir / MANIFEST_FILE
    if not path.exists():
        return set()
    try:
        data = json.loads(path.read_text())
        return set(data.get("used_permit_numbers", []))
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("Could not read manifest at %s: %s", path, e)
        return set()


def write_manifest(output_dir: Path, used: set[str]) -> None:
    """Write the manifest atomically. Per-iteration writes preserve progress on Ctrl-C."""
    path = output_dir / MANIFEST_FILE
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps({"used_permit_numbers": sorted(used)}, indent=2))
    tmp.replace(path)


def reset_output_dir(output_dir: Path, template_path: Path) -> None:
    """Delete generated PDFs, manifest, and labels file, preserving the template."""
    template_name = template_path.name
    for pdf in output_dir.glob("*.pdf"):
        if pdf.name == template_name:
            continue
        pdf.unlink()
    for fname in (MANIFEST_FILE, LABELS_FILE):
        path = output_dir / fname
        if path.exists():
            path.unlink()
    logger.info("Reset %s (preserved template %s)", output_dir, template_name)


def load_labels(output_dir: Path) -> dict:
    """Load existing labels.json (or empty dict if missing)."""
    path = output_dir / LABELS_FILE
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("Could not read labels at %s: %s", path, e)
        return {}


def write_labels(output_dir: Path, labels: dict) -> None:
    """Write labels.json atomically."""
    path = output_dir / LABELS_FILE
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(labels, indent=2, sort_keys=True))
    tmp.replace(path)


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------


def build_plan(n_correct: int, n_minor: int, n_major: int) -> list[str]:
    """Return an ordered list of flavors to generate."""
    return ["correct"] * n_correct + ["minor"] * n_minor + ["major"] * n_major


def parse_args() -> argparse.Namespace:
    """Parse CLI arguments for the generator."""
    parser = argparse.ArgumentParser(
        description="Generate Form 3-8 PDFs (correct/minor/major) for the validation pipeline"
    )
    parser.add_argument(
        "--correct", type=int, default=50, help="Correct PDFs (default: 50)"
    )
    parser.add_argument(
        "--minor", type=int, default=30, help="Minor-error PDFs (default: 30)"
    )
    parser.add_argument(
        "--major", type=int, default=20, help="Major-error PDFs (default: 20)"
    )
    parser.add_argument(
        "--max-minor-mutations",
        type=int,
        default=MAX_MINOR_MUTATIONS,
        help=f"Max field mutations per minor PDF (default: {MAX_MINOR_MUTATIONS})",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Wipe existing generated PDFs and manifest before generating",
    )
    parser.add_argument("--output-dir", default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--template", default=DEFAULT_TEMPLATE)
    parser.add_argument(
        "--skip-scrape", action="store_true", help="Skip DBI contractor scraping"
    )
    parser.add_argument(
        "--delay", type=float, default=3.0, help="Delay between DBI requests"
    )
    parser.add_argument("--verbose", action="store_true")
    return parser.parse_args()


def prepare_records(plan: list[str], used: set[str]) -> list[dict]:
    """Fetch from SODA and filter out used/duplicate/incomplete records."""
    fetch_target = len(plan) * 3
    records = fetch_permits(fetch_target, offset=0)
    if not records:
        return []

    seen: set[str] = set()
    valid: list[dict] = []
    for r in records:
        pn = r.get("permit_number")
        if not pn or pn in used or pn in seen or not r.get("street_number"):
            continue
        seen.add(pn)
        valid.append(r)
    logger.info("Got %d valid unused records (of %d fetched)", len(valid), len(records))

    if len(valid) < len(plan):
        logger.warning(
            "Only %d records available but plan needs %d. Some slots will be skipped.",
            len(valid),
            len(plan),
        )
    return valid


def run_generation_loop(
    plan: list[str],
    valid: list[dict],
    args: argparse.Namespace,
    template: Path,
    output_dir: Path,
    used: set[str],
    labels: dict,
) -> tuple[dict, dict]:
    """Generate PDFs slot by slot. Returns (counts, minor_histogram)."""
    session = requests.Session() if not args.skip_scrape else None
    counts = {"correct": 0, "minor": 0, "major": 0}
    minor_histogram: dict[int, int] = {}
    record_iter = iter(valid)

    for i, flavor in enumerate(plan):
        record = next(record_iter, None)
        if record is None:
            logger.warning("Ran out of records at slot %d", i)
            break

        permit_num = record["permit_number"]

        contractor = None
        if session:
            logger.debug("Scraping contractor for %s", permit_num)
            contractor = scrape_contractor(session, permit_num)
            if i < len(plan) - 1:
                time.sleep(args.delay)

        fields = map_to_fields(record, contractor)

        mutation_records: list[dict] = []
        if flavor == "minor":
            fields, mutation_records = corrupt_minor(
                fields, permit_num, args.max_minor_mutations
            )
            n = len(mutation_records)
            minor_histogram[n] = minor_histogram.get(n, 0) + 1
        elif flavor == "major":
            fields, mutation_records = corrupt_major(record, fields, valid)

        mutation_count = len(mutation_records)
        filename = output_filename(flavor, permit_num, mutation_count)
        out_path = output_dir / filename

        if fill_pdf(str(template), str(out_path), fields):
            counts[flavor] += 1
            used.add(permit_num)
            write_manifest(output_dir, used)
            labels[filename] = {
                "flavor": flavor,
                "permit_number": permit_num,
                "permit_type": record.get("permit_type", ""),
                "mutation_count": mutation_count,
                "mutations": mutation_records,
            }
            write_labels(output_dir, labels)
            print(f"[{i + 1}/{len(plan)}] {filename}")
        else:
            logger.warning("Skipped %s due to fill error", filename)

    return counts, minor_histogram


def print_summary(counts: dict, minor_histogram: dict, output_dir: Path) -> None:
    """Print the final per-flavor summary."""
    print("\nSummary:")
    print(f"  Correct:  {counts['correct']}")
    if minor_histogram:
        hist = ", ".join(f"{n}x{c}" for n, c in sorted(minor_histogram.items()))
        print(f"  Minor:    {counts['minor']}  (mutations: {hist})")
    else:
        print(f"  Minor:    {counts['minor']}")
    print(f"  Major:    {counts['major']}")
    print(f"  Output:   {output_dir}/")
    print(f"  Labels:   {output_dir}/{LABELS_FILE}")


def main():
    args = parse_args()

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

    if args.reset:
        reset_output_dir(output_dir, template)

    plan = build_plan(args.correct, args.minor, args.major)
    if not plan:
        logger.error("Nothing to generate (all counts are zero)")
        return

    used = load_manifest(output_dir)
    logger.info("Manifest has %d permit numbers already used", len(used))

    valid = prepare_records(plan, used)
    if not valid:
        logger.error("No records fetched from SODA API")
        return

    labels = load_labels(output_dir)
    counts, minor_histogram = run_generation_loop(
        plan, valid, args, template, output_dir, used, labels
    )
    print_summary(counts, minor_histogram, output_dir)


if __name__ == "__main__":
    main()
