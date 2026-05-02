from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.business import Bill, IncomeRecord
from app.models.content import CalendarEvent
from app.models.user import User
from app.models.writing import WritingProject
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    projects_result = await db.execute(select(WritingProject))
    projects = projects_result.scalars().all()

    active_projects = [p for p in projects if p.status in ("draft", "in_progress")]
    completed_this_week = [
        p for p in projects
        if p.status == "completed" and p.updated_at and p.updated_at >= week_ago
    ]

    upcoming_events_result = await db.execute(
        select(CalendarEvent)
        .where(CalendarEvent.scheduled_date >= now)
        .where(CalendarEvent.scheduled_date <= now + timedelta(days=7))
        .order_by(CalendarEvent.scheduled_date)
        .limit(10)
    )
    upcoming_events = upcoming_events_result.scalars().all()

    income_result = await db.execute(
        select(IncomeRecord).where(IncomeRecord.date >= week_ago)
    )
    recent_income = income_result.scalars().all()
    weekly_income = sum(r.amount for r in recent_income)

    bills_result = await db.execute(
        select(Bill)
        .where(Bill.is_paid == False)  # noqa: E712
        .where(Bill.due_date <= now + timedelta(days=7))
        .order_by(Bill.due_date)
    )
    upcoming_bills = bills_result.scalars().all()

    return {
        "greeting": f"Welcome back, {current_user.full_name}!",
        "role": current_user.role,
        "writing": {
            "active_projects": len(active_projects),
            "completed_this_week": len(completed_this_week),
            "total_projects": len(projects),
        },
        "calendar": {
            "upcoming_count": len(upcoming_events),
            "events": [
                {
                    "id": e.id,
                    "title": e.title,
                    "type": e.event_type,
                    "date": e.scheduled_date.isoformat(),
                }
                for e in upcoming_events
            ],
        },
        "finances": {
            "weekly_income": weekly_income,
            "upcoming_bills": [
                {
                    "id": b.id,
                    "name": b.name,
                    "amount": b.amount,
                    "due_date": b.due_date.isoformat(),
                }
                for b in upcoming_bills
            ],
        },
        "timestamp": now.isoformat(),
    }
