from pydantic import BaseModel


class PredictionResponse(BaseModel):
    id: int
    label: str
    probabilities: dict[str, float]
    pdf_sha256: str


class HistoryEntry(BaseModel):
    id: int
    filename: str
    uploaded_at: str
    label: str
    confidence: float
    probabilities: dict[str, float]
    text_preview: str | None = None
    file_size: int | None = None
    pdf_sha256: str | None = None


class HistoryResponse(BaseModel):
    items: list[HistoryEntry]
    total: int
    page: int


class StatsResponse(BaseModel):
    total: int
    label_counts: dict[str, int]
    recent_count_7d: int


class ExtractedFields(BaseModel):
    application_number: str | None = None
    date_filed: str | None = None
    project_address: str | None = None
    parcel_number: str | None = None
    estimated_cost: str | None = None
    stories: str | None = None
    dwelling_units: str | None = None
    proposed_use: str | None = None
    occupancy_class: str | None = None
    construction_type: str | None = None
    contractor_name: str | None = None
    contractor_address: str | None = None
    license_number: str | None = None
    owner_name: str | None = None
    description: str | None = None


class Completeness(BaseModel):
    passed: bool
    missing: list[str]


class ExtractedFieldsResponse(BaseModel):
    fields: ExtractedFields
    completeness: Completeness
