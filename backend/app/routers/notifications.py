"""Notifications and reminders system."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

_notifications: dict[int, list[dict]] = {}


class ReminderCreate(BaseModel):
    title: str
    message: str
    category: str = "general"
    priority: str = "normal"
    due_date: str | None = None


def _get_user_notifications(user_id: int) -> list[dict]:
    if user_id not in _notifications:
        _notifications[user_id] = _generate_default_notifications()
    return _notifications[user_id]


def _generate_default_notifications() -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    return [
        {
            "id": 1,
            "title": "Daily Content Quota",
            "message": (
                "Reminder: Create 1 cartoon, 1 podcast, "
                "and 1 short today."
            ),
            "category": "production",
            "priority": "high",
            "read": False,
            "created_at": now,
            "type": "reminder",
        },
        {
            "id": 2,
            "title": "Weekly Analytics Review",
            "message": (
                "Time to review this week's content performance "
                "and audience engagement."
            ),
            "category": "analytics",
            "priority": "normal",
            "read": False,
            "created_at": now,
            "type": "reminder",
        },
        {
            "id": 3,
            "title": "Monthly Production Goals",
            "message": (
                "Track progress: 3 novels, 35 workbooks, "
                "15 notebooks, 30 episodes this month."
            ),
            "category": "production",
            "priority": "high",
            "read": False,
            "created_at": now,
            "type": "reminder",
        },
        {
            "id": 4,
            "title": "System Health Check",
            "message": "All services running normally. No issues detected.",
            "category": "system",
            "priority": "low",
            "read": False,
            "created_at": now,
            "type": "alert",
        },
        {
            "id": 5,
            "title": "Backup Reminder",
            "message": (
                "Database backup recommended. Go to System > Backups "
                "to create one."
            ),
            "category": "system",
            "priority": "normal",
            "read": False,
            "created_at": now,
            "type": "reminder",
        },
    ]


@router.get("")
async def get_notifications(
    current_user: User = Depends(get_current_user),
):
    """Get all notifications for the current user."""
    notes = _get_user_notifications(current_user.id)
    unread = sum(1 for n in notes if not n["read"])
    return {"notifications": notes, "unread_count": unread}


@router.post("")
async def create_reminder(
    data: ReminderCreate,
    current_user: User = Depends(get_current_user),
):
    """Create a custom reminder."""
    notes = _get_user_notifications(current_user.id)
    new_id = max((n["id"] for n in notes), default=0) + 1
    notification = {
        "id": new_id,
        "title": data.title,
        "message": data.message,
        "category": data.category,
        "priority": data.priority,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "due_date": data.due_date,
        "type": "reminder",
    }
    notes.append(notification)
    return notification


@router.put("/{notification_id}/read")
async def mark_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
):
    """Mark a notification as read."""
    notes = _get_user_notifications(current_user.id)
    for n in notes:
        if n["id"] == notification_id:
            n["read"] = True
            return n
    return {"detail": "Not found"}


@router.put("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read."""
    notes = _get_user_notifications(current_user.id)
    for n in notes:
        n["read"] = True
    return {"marked": len(notes)}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
):
    """Delete a notification."""
    notes = _get_user_notifications(current_user.id)
    _notifications[current_user.id] = [
        n for n in notes if n["id"] != notification_id
    ]
    return {"deleted": notification_id}
