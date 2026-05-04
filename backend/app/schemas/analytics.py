from datetime import datetime

from pydantic import BaseModel


class WatchlistCreate(BaseModel):
    symbol: str
    name: str
    asset_type: str = "stock"
    notes: str | None = None


class WatchlistResponse(BaseModel):
    id: int
    symbol: str
    name: str
    asset_type: str
    notes: str | None
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class TradeLogCreate(BaseModel):
    symbol: str
    action: str
    quantity: float
    price: float
    date: datetime
    notes: str | None = None


class TradeLogResponse(BaseModel):
    id: int
    symbol: str
    action: str
    quantity: float
    price: float
    date: datetime
    notes: str | None
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SportsEventCreate(BaseModel):
    sport: str
    event_name: str
    teams: str
    analysis: str | None = None
    odds_team1: str | None = None
    odds_team2: str | None = None
    odds_draw: str | None = None
    prediction: str | None = None
    confidence: str | None = None
    event_date: datetime


class SportsEventResponse(BaseModel):
    id: int
    sport: str
    event_name: str
    teams: str
    analysis: str | None
    odds_team1: str | None
    odds_team2: str | None
    odds_draw: str | None
    prediction: str | None
    confidence: str | None
    result: str | None
    event_date: datetime
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ParlayCreate(BaseModel):
    name: str
    legs: list[str]
    total_odds: str | None = None
    stake: float | None = None
    potential_payout: float | None = None


class ParlayResponse(BaseModel):
    id: int
    name: str
    legs: str
    total_odds: str | None
    stake: float | None
    potential_payout: float | None
    status: str
    result_notes: str | None
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}
