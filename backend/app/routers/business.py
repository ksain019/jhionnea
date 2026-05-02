from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.business import Bill, CreditRecord, IncomeRecord
from app.models.user import User
from app.schemas.business import (
    BillCreate,
    BillResponse,
    CreditRecordCreate,
    CreditRecordResponse,
    IncomeRecordCreate,
    IncomeRecordResponse,
    MoneySnapshot,
)
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/business", tags=["business"])


@router.get("/income", response_model=list[IncomeRecordResponse])
async def list_income(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(IncomeRecord).order_by(IncomeRecord.date.desc()))
    return result.scalars().all()


@router.post("/income", response_model=IncomeRecordResponse, status_code=201)
async def create_income(
    data: IncomeRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = IncomeRecord(**data.model_dump(), created_by=current_user.id)
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


@router.get("/credit", response_model=list[CreditRecordResponse])
async def list_credit(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(CreditRecord).order_by(CreditRecord.created_at.desc()))
    return result.scalars().all()


@router.post("/credit", response_model=CreditRecordResponse, status_code=201)
async def create_credit(
    data: CreditRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    utilization = (data.current_balance / data.credit_limit * 100) if data.credit_limit > 0 else 0
    record = CreditRecord(
        **data.model_dump(),
        utilization=round(utilization, 2),
        created_by=current_user.id,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


@router.get("/bills", response_model=list[BillResponse])
async def list_bills(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Bill).order_by(Bill.due_date))
    return result.scalars().all()


@router.post("/bills", response_model=BillResponse, status_code=201)
async def create_bill(
    data: BillCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bill = Bill(**data.model_dump(), created_by=current_user.id)
    db.add(bill)
    await db.commit()
    await db.refresh(bill)
    return bill


@router.get("/snapshot", response_model=MoneySnapshot)
async def money_snapshot(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    income_result = await db.execute(select(IncomeRecord))
    incomes = income_result.scalars().all()

    bills_result = await db.execute(select(Bill))
    bills = bills_result.scalars().all()

    credit_result = await db.execute(select(CreditRecord))
    credits = credit_result.scalars().all()

    total_income = sum(r.amount for r in incomes)
    income_by_source: dict[str, float] = {}
    for r in incomes:
        income_by_source[r.source] = income_by_source.get(r.source, 0) + r.amount

    total_bills = sum(b.amount for b in bills)
    unpaid_bills = sum(b.amount for b in bills if not b.is_paid)

    avg_utilization = (
        sum(c.utilization for c in credits) / len(credits) if credits else 0
    )

    now = datetime.now(timezone.utc)
    return MoneySnapshot(
        total_income=total_income,
        income_by_source=income_by_source,
        total_bills=total_bills,
        unpaid_bills=unpaid_bills,
        credit_utilization=round(avg_utilization, 2),
        period=now.strftime("%B %Y"),
    )
