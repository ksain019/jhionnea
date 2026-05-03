import json

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.analytics import ParlayBet, SportsEvent, TradeLog, Watchlist
from app.models.user import User
from app.schemas.analytics import (
    ParlayCreate,
    ParlayResponse,
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


# ── Parlays ────────────────────────────────────────────────────────────────────

@router.get("/parlays", response_model=list[ParlayResponse])
async def list_parlays(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ParlayBet).order_by(ParlayBet.created_at.desc())
    )
    return result.scalars().all()


@router.post("/parlays", response_model=ParlayResponse, status_code=201)
async def create_parlay(
    data: ParlayCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    parlay = ParlayBet(
        name=data.name,
        legs=json.dumps(data.legs),
        total_odds=data.total_odds,
        stake=data.stake,
        potential_payout=data.potential_payout,
        created_by=current_user.id,
    )
    db.add(parlay)
    await db.commit()
    await db.refresh(parlay)
    return parlay


@router.put("/parlays/{parlay_id}/result", response_model=ParlayResponse)
async def update_parlay_result(
    parlay_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi import HTTPException

    result = await db.execute(
        select(ParlayBet).where(ParlayBet.id == parlay_id)
    )
    parlay = result.scalar_one_or_none()
    if not parlay:
        raise HTTPException(status_code=404, detail="Parlay not found")
    parlay.status = data.get("status", parlay.status)
    parlay.result_notes = data.get("result_notes", parlay.result_notes)
    await db.commit()
    await db.refresh(parlay)
    return parlay
