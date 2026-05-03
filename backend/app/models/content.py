from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255))
    event_type: Mapped[str] = mapped_column(String(50))
    platform: Mapped[str | None] = mapped_column(String(50), nullable=True)
    scheduled_date: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(30), default="scheduled")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ContentDraft(Base):
    __tablename__ = "content_drafts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255))
    platform: Mapped[str] = mapped_column(
        String(50)
    )  # medium, fiverr, email, pocket_fm
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class YouTubeProject(Base):
    __tablename__ = "youtube_projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255))
    project_type: Mapped[str] = mapped_column(
        String(50)
    )  # cartoon, reel, educational_video
    topic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    target_age: Mapped[str | None] = mapped_column(String(50), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=10)
    script: Mapped[str | None] = mapped_column(Text, nullable=True)
    storyboard: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), default="idea"
    )  # idea, scripting, production, published
    season: Mapped[int | None] = mapped_column(Integer, nullable=True)
    episode_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    channel_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class PodcastEpisode(Base):
    __tablename__ = "podcast_episodes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255))
    show_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    topic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    script: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    voice_style: Mapped[str] = mapped_column(
        String(50), default="professional"
    )  # professional, casual, energetic
    status: Mapped[str] = mapped_column(
        String(30), default="draft"
    )  # draft, scripted, recorded, published
    episode_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class SocialPost(Base):
    __tablename__ = "social_posts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    platform: Mapped[str] = mapped_column(String(50))
    content: Mapped[str] = mapped_column(Text)
    media_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    scheduled_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    post_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
