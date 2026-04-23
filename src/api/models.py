from pydantic import BaseModel


class HistoryEntry(BaseModel):
    id: int
    filename: str
    uploaded_at: str
    label: str
    confidence: float
    probabilities: dict[str, float]
    text_preview: str | None = None
    file_size: int | None = None


class HistoryResponse(BaseModel):
    items: list[HistoryEntry]
    total: int
    page: int


class StatsResponse(BaseModel):
    total: int
    label_counts: dict[str, int]
    recent_count_7d: int
