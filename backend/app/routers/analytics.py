from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.analytics import SportsEvent, TradeLog, Watchlist
from app.models.user import User
from app.schemas.analytics import (
    SportsEventCreate,
    SportsEventResponse,
    TradeLogCreate,
    TradeLogResponse,
    WatchlistCreate,
    WatchlistResponse,
)
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/watchlist", response_model=list[WatchlistResponse])
async def list_watchlist(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Watchlist).order_by(Watchlist.created_at.desc()))
    return result.scalars().all()


@router.post("/watchlist", response_model=WatchlistResponse, status_code=201)
async def add_to_watchlist(
    data: WatchlistCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = Watchlist(**data.model_dump(), created_by=current_user.id)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/trades", response_model=list[TradeLogResponse])
async def list_trades(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(TradeLog).order_by(TradeLog.date.desc()))
    return result.scalars().all()


@router.post("/trades", response_model=TradeLogResponse, status_code=201)
async def log_trade(
    data: TradeLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = TradeLog(**data.model_dump(), created_by=current_user.id)
    db.add(trade)
    await db.commit()
    await db.refresh(trade)
    return trade


@router.get("/sports", response_model=list[SportsEventResponse])
async def list_sports_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(SportsEvent).order_by(SportsEvent.event_date.desc()))
    return result.scalars().all()


@router.post("/sports", response_model=SportsEventResponse, status_code=201)
async def create_sports_event(
    data: SportsEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = SportsEvent(**data.model_dump(), created_by=current_user.id)
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event
