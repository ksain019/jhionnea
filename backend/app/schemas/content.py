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


class YouTubeProjectCreate(BaseModel):
    title: str
    project_type: str  # cartoon, reel, educational_video
    topic: str | None = None
    target_age: str | None = None
    duration_minutes: int = 10
    channel_name: str | None = None
    season: int | None = None
    episode_number: int | None = None


class YouTubeProjectResponse(BaseModel):
    id: int
    title: str
    project_type: str
    topic: str | None
    target_age: str | None
    duration_minutes: int
    script: str | None
    storyboard: str | None
    status: str
    season: int | None
    episode_number: int | None
    channel_name: str | None
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PodcastEpisodeCreate(BaseModel):
    title: str
    show_name: str | None = None
    topic: str | None = None
    duration_minutes: int = 30
    voice_style: str = "professional"
    episode_number: int | None = None


class PodcastEpisodeResponse(BaseModel):
    id: int
    title: str
    show_name: str | None
    topic: str | None
    script: str | None
    notes: str | None
    duration_minutes: int
    voice_style: str
    status: str
    episode_number: int | None
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GenerateScriptRequest(BaseModel):
    project_id: int
    additional_notes: str | None = None
