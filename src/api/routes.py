import json
from json import JSONDecodeError

from fastapi import APIRouter, HTTPException

from .database import get_classification, get_history, get_stats
from .models import HistoryEntry, HistoryResponse, StatsResponse

router = APIRouter()


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
