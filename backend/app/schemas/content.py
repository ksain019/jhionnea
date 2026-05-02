from datetime import datetime

from pydantic import BaseModel


class CalendarEventCreate(BaseModel):
    title: str
    event_type: str
    platform: str | None = None
    scheduled_date: datetime
    notes: str | None = None


class CalendarEventResponse(BaseModel):
    id: int
    title: str
    event_type: str
    platform: str | None
    scheduled_date: datetime
    status: str
    notes: str | None
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ContentDraftCreate(BaseModel):
    title: str
    platform: str
    content: str | None = None


class ContentDraftResponse(BaseModel):
    id: int
    title: str
    platform: str
    status: str
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}
