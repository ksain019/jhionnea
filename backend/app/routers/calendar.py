"""Content calendar for scheduling and tracking production."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

_calendar_events: dict[int, list[dict]] = {}


class CalendarEvent(BaseModel):
    title: str
    date: str
    platform: str = "general"
    content_type: str = "other"
    status: str = "planned"
    notes: str = ""


def _get_user_events(user_id: int) -> list[dict]:
    if user_id not in _calendar_events:
        _calendar_events[user_id] = _generate_sample_events()
    return _calendar_events[user_id]


def _generate_sample_events() -> list[dict]:
    now = datetime.now(timezone.utc)
    year = now.year
    month = now.month
    return [
        {
            "id": 1,
            "title": "Daily Cartoon — Jiah Episode",
            "date": f"{year}-{month:02d}-{now.day:02d}",
            "platform": "youtube",
            "content_type": "cartoon",
            "status": "planned",
            "notes": "5-10 min, kid-safe, Jiah character only",
        },
        {
            "id": 2,
            "title": "Podcast Episode Recording",
            "date": f"{year}-{month:02d}-{now.day:02d}",
            "platform": "podcast",
            "content_type": "podcast",
            "status": "planned",
            "notes": "Hook > Intro > Segments > Outro",
        },
        {
            "id": 3,
            "title": "Short-Form Video",
            "date": f"{year}-{month:02d}-{now.day:02d}",
            "platform": "social",
            "content_type": "short",
            "status": "planned",
            "notes": "60-second reel for social media",
        },
        {
            "id": 4,
            "title": "Novel Draft — Chapter 5",
            "date": f"{year}-{month:02d}-{min(now.day + 2, 28):02d}",
            "platform": "kdp",
            "content_type": "novel",
            "status": "in_progress",
            "notes": "Romance novel, 20-chapter outline",
        },
        {
            "id": 5,
            "title": "Workbook — Grade 3 Math",
            "date": f"{year}-{month:02d}-{min(now.day + 3, 28):02d}",
            "platform": "tpt",
            "content_type": "workbook",
            "status": "planned",
            "notes": "10 units, 10-15 worksheets each",
        },
        {
            "id": 6,
            "title": "Medium Article",
            "date": f"{year}-{month:02d}-{min(now.day + 5, 28):02d}",
            "platform": "medium",
            "content_type": "article",
            "status": "draft",
            "notes": "Education blog post",
        },
    ]


@router.get("/events")
async def get_events(
    month: int | None = None,
    year: int | None = None,
    current_user: User = Depends(get_current_user),
):
    """Get calendar events for a month."""
    events = _get_user_events(current_user.id)
    if month and year:
        prefix = f"{year}-{month:02d}"
        events = [e for e in events if e["date"].startswith(prefix)]
    return {"events": events}


@router.post("/events")
async def create_event(
    data: CalendarEvent,
    current_user: User = Depends(get_current_user),
):
    """Create a calendar event."""
    events = _get_user_events(current_user.id)
    new_id = max((e["id"] for e in events), default=0) + 1
    event = {
        "id": new_id,
        "title": data.title,
        "date": data.date,
        "platform": data.platform,
        "content_type": data.content_type,
        "status": data.status,
        "notes": data.notes,
    }
    events.append(event)
    return event


@router.put("/events/{event_id}")
async def update_event(
    event_id: int,
    data: CalendarEvent,
    current_user: User = Depends(get_current_user),
):
    """Update a calendar event."""
    events = _get_user_events(current_user.id)
    for e in events:
        if e["id"] == event_id:
            e.update({
                "title": data.title,
                "date": data.date,
                "platform": data.platform,
                "content_type": data.content_type,
                "status": data.status,
                "notes": data.notes,
            })
            return e
    return {"detail": "Not found"}


@router.delete("/events/{event_id}")
async def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
):
    """Delete a calendar event."""
    events = _get_user_events(current_user.id)
    _calendar_events[current_user.id] = [
        e for e in events if e["id"] != event_id
    ]
    return {"deleted": event_id}


@router.get("/platforms")
async def list_platforms(
    current_user: User = Depends(get_current_user),
):
    """List all publishing platforms from Master File."""
    return {
        "platforms": [
            {"id": "kdp", "name": "KDP (Amazon)", "type": "publishing"},
            {"id": "ingram", "name": "IngramSpark", "type": "publishing"},
            {"id": "apple", "name": "Apple Books", "type": "publishing"},
            {"id": "kobo", "name": "Kobo", "type": "publishing"},
            {"id": "google", "name": "Google Play Books", "type": "publishing"},
            {"id": "d2d", "name": "Draft2Digital", "type": "publishing"},
            {"id": "wattpad", "name": "Wattpad", "type": "publishing"},
            {"id": "webnovel", "name": "Webnovel", "type": "publishing"},
            {"id": "pocketfm", "name": "Pocket FM", "type": "publishing"},
            {"id": "tpt", "name": "TPT", "type": "education"},
            {"id": "classful", "name": "Classful", "type": "education"},
            {"id": "etsy", "name": "Etsy", "type": "marketplace"},
            {"id": "payhip", "name": "Payhip", "type": "marketplace"},
            {"id": "gumroad", "name": "Gumroad", "type": "marketplace"},
            {"id": "youtube", "name": "YouTube Kids", "type": "video"},
            {"id": "medium", "name": "Medium", "type": "writing"},
            {"id": "podcast", "name": "Podcast", "type": "audio"},
            {"id": "social", "name": "Social Media", "type": "social"},
        ]
    }
