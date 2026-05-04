from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Watchlist(Base):
    __tablename__ = "watchlist"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(20))
    name: Mapped[str] = mapped_column(String(100))
    asset_type: Mapped[str] = mapped_column(String(30), default="stock")  # stock, etf, crypto
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class TradeLog(Base):
    __tablename__ = "trade_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(20))
    action: Mapped[str] = mapped_column(String(10))  # buy, sell
    quantity: Mapped[float] = mapped_column(Float)
    price: Mapped[float] = mapped_column(Float)
    date: Mapped[datetime] = mapped_column(DateTime)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class SportsEvent(Base):
    __tablename__ = "sports_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sport: Mapped[str] = mapped_column(String(50))
    event_name: Mapped[str] = mapped_column(String(255))
    teams: Mapped[str] = mapped_column(String(255))
    analysis: Mapped[str | None] = mapped_column(Text, nullable=True)
    odds_team1: Mapped[str | None] = mapped_column(String(20), nullable=True)
    odds_team2: Mapped[str | None] = mapped_column(String(20), nullable=True)
    odds_draw: Mapped[str | None] = mapped_column(String(20), nullable=True)
    prediction: Mapped[str | None] = mapped_column(String(255), nullable=True)
    confidence: Mapped[str | None] = mapped_column(String(20), nullable=True)
    result: Mapped[str | None] = mapped_column(String(100), nullable=True)
    event_date: Mapped[datetime] = mapped_column(DateTime)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class ParlayBet(Base):
    __tablename__ = "parlay_bets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))
    legs: Mapped[str] = mapped_column(Text)  # JSON array of leg descriptions
    total_odds: Mapped[str | None] = mapped_column(String(50), nullable=True)
    stake: Mapped[float | None] = mapped_column(Float, nullable=True)
    potential_payout: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="pending")  # pending, won, lost
    result_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
