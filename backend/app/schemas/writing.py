from datetime import datetime

from pydantic import BaseModel


class WritingProjectCreate(BaseModel):
    title: str
    project_type: str
    target_platform: str | None = None
    content: str | None = None


class WritingProjectResponse(BaseModel):
    id: int
    title: str
    project_type: str
    status: str
    word_count: int
    target_platform: str | None
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WritingProjectUpdate(BaseModel):
    title: str | None = None
    status: str | None = None
    content: str | None = None
    target_platform: str | None = None


class EpisodeCreate(BaseModel):
    project_id: int
    episode_number: int
    title: str
    content: str | None = None


class EpisodeResponse(BaseModel):
    id: int
    project_id: int
    episode_number: int
    title: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
