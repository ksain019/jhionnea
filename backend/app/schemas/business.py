from datetime import datetime

from pydantic import BaseModel


class IncomeRecordCreate(BaseModel):
    source: str
    amount: float
    description: str | None = None
    date: datetime


class IncomeRecordResponse(BaseModel):
    id: int
    source: str
    amount: float
    description: str | None
    date: datetime
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CreditRecordCreate(BaseModel):
    account_name: str
    credit_limit: float
    current_balance: float
    notes: str | None = None


class CreditRecordResponse(BaseModel):
    id: int
    account_name: str
    credit_limit: float
    current_balance: float
    utilization: float
    notes: str | None
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class BillCreate(BaseModel):
    name: str
    amount: float
    due_date: datetime
    recurring: bool = False


class BillResponse(BaseModel):
    id: int
    name: str
    amount: float
    due_date: datetime
    is_paid: bool
    recurring: bool
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class MoneySnapshot(BaseModel):
    total_income: float
    income_by_source: dict[str, float]
    total_bills: float
    unpaid_bills: float
    credit_utilization: float
    period: str
