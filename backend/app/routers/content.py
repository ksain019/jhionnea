from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.content import CalendarEvent, ContentDraft
from app.models.user import User
from app.schemas.content import (
    CalendarEventCreate,
    CalendarEventResponse,
    ContentDraftCreate,
    ContentDraftResponse,
)
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/content", tags=["content"])


@router.get("/calendar", response_model=list[CalendarEventResponse])
async def list_calendar_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CalendarEvent).order_by(CalendarEvent.scheduled_date)
    )
    return result.scalars().all()


@router.post("/calendar", response_model=CalendarEventResponse, status_code=201)
async def create_calendar_event(
    data: CalendarEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = CalendarEvent(**data.model_dump(), created_by=current_user.id)
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.get("/drafts", response_model=list[ContentDraftResponse])
async def list_drafts(
    platform: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(ContentDraft).order_by(ContentDraft.created_at.desc())
    if platform:
        query = query.where(ContentDraft.platform == platform)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/drafts", response_model=ContentDraftResponse, status_code=201)
async def create_draft(
    data: ContentDraftCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    draft = ContentDraft(**data.model_dump(), created_by=current_user.id)
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return draft
