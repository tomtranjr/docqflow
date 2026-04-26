import json
import re
from json import JSONDecodeError

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, JSONResponse

from .database import get_classification, get_history, get_stats
from .models import HistoryEntry, HistoryResponse, StatsResponse
from .pdf_storage import pdf_path

router = APIRouter()

_FILENAME_UNSAFE = re.compile(r'[\r\n"\\]')


def _safe_disposition_filename(filename: str) -> str:
    """Strip CRLF, quotes, and backslashes from filenames before reflecting them
    into Content-Disposition. Prevents response header injection."""
    return _FILENAME_UNSAFE.sub("_", filename)


@router.get("/history", response_model=HistoryResponse)
async def list_history(
    page: int = 1,
    limit: int = 25,
    label: str | None = None,
    search: str | None = None,
):
    if page < 1:
        raise HTTPException(status_code=422, detail="page must be >= 1")
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=422, detail="limit must be between 1 and 100")
    result = await get_history(page, limit, label, search)
    items = []
    for item in result["items"]:
        probs = item["probabilities"]
        if isinstance(probs, str):
            try:
                probs = json.loads(probs)
            except JSONDecodeError:
                probs = {}
        items.append(HistoryEntry(**{**item, "probabilities": probs}))
    return HistoryResponse(items=items, total=result["total"], page=result["page"])


@router.get("/history/{entry_id}", response_model=HistoryEntry)
async def get_history_entry(entry_id: int):
    result = await get_classification(entry_id)
    if not result:
        raise HTTPException(status_code=404, detail="Classification not found")
    probs = result["probabilities"]
    if isinstance(probs, str):
        try:
            probs = json.loads(probs)
        except JSONDecodeError:
            probs = {}
    return HistoryEntry(**{**result, "probabilities": probs})


@router.get("/stats", response_model=StatsResponse)
async def stats():
    return await get_stats()


@router.get("/classifications/{classification_id}", response_model=HistoryEntry)
async def get_classification_metadata(classification_id: int):
    result = await get_classification(classification_id)
    if not result:
        raise HTTPException(status_code=404, detail="Classification not found")
    probs = result["probabilities"]
    if isinstance(probs, str):
        try:
            probs = json.loads(probs)
        except JSONDecodeError:
            probs = {}
    return HistoryEntry(**{**result, "probabilities": probs})


@router.get("/classifications/{classification_id}/pdf")
async def get_classification_pdf(classification_id: int):
    row = await get_classification(classification_id)
    if not row:
        raise HTTPException(status_code=404, detail="Classification not found")
    sha = row.get("pdf_sha256")
    if not sha:
        return JSONResponse(
            status_code=410,
            content={
                "error_code": "pdf_missing",
                "message": "PDF unavailable for legacy submission",
            },
        )
    path = pdf_path(sha)
    safe_name = _safe_disposition_filename(row["filename"])
    try:
        return FileResponse(
            path,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{safe_name}"'},
        )
    except FileNotFoundError:
        return JSONResponse(
            status_code=410,
            content={
                "error_code": "pdf_missing",
                "message": "PDF file missing on disk",
            },
        )
