from datetime import datetime

from pydantic import BaseModel


class DocumentCreate(BaseModel):
    title: str
    doc_type: str  # paper, novel, essay, report, thesis, manuscript
    format_style: str = "apa"  # apa, mla, chicago, custom
    content: str | None = None
    notes: str | None = None


class DocumentResponse(BaseModel):
    id: int
    title: str
    doc_type: str
    format_style: str
    content: str | None
    formatted_content: str | None
    word_count: int
    page_count: int
    status: str
    notes: str | None
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FormatRequest(BaseModel):
    content: str
    format_style: str = "apa"
    doc_type: str = "paper"
