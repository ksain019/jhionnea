from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class EmailRule(Base):
    __tablename__ = "email_rules"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))
    rule_type: Mapped[str] = mapped_column(
        String(50)
    )  # keep, delete, archive, label
    condition_field: Mapped[str] = mapped_column(
        String(50)
    )  # from, subject, body, label
    condition_value: Mapped[str] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(default=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class EmailLog(Base):
    __tablename__ = "email_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email_from: Mapped[str] = mapped_column(String(255))
    email_subject: Mapped[str] = mapped_column(String(500))
    action_taken: Mapped[str] = mapped_column(String(50))  # kept, deleted, archived
    rule_id: Mapped[int | None] = mapped_column(
        ForeignKey("email_rules.id"), nullable=True
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    processed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
