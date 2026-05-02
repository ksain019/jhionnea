from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.teaching import Assignment, Curriculum
from app.models.user import User
from app.schemas.teaching import (
    AssignmentCreate,
    AssignmentResponse,
    CurriculumCreate,
    CurriculumResponse,
)
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/teaching", tags=["teaching"])


@router.get("/curricula", response_model=list[CurriculumResponse])
async def list_curricula(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Curriculum).order_by(Curriculum.created_at.desc()))
    return result.scalars().all()


@router.post("/curricula", response_model=CurriculumResponse, status_code=201)
async def create_curriculum(
    data: CurriculumCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    curriculum = Curriculum(**data.model_dump(), created_by=current_user.id)
    db.add(curriculum)
    await db.commit()
    await db.refresh(curriculum)
    return curriculum


@router.get("/curricula/{curriculum_id}", response_model=CurriculumResponse)
async def get_curriculum(
    curriculum_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Curriculum).where(Curriculum.id == curriculum_id))
    curriculum = result.scalar_one_or_none()
    if not curriculum:
        raise HTTPException(status_code=404, detail="Curriculum not found")
    return curriculum


@router.get("/assignments", response_model=list[AssignmentResponse])
async def list_assignments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Assignment).order_by(Assignment.created_at.desc()))
    return result.scalars().all()


@router.post("/assignments", response_model=AssignmentResponse, status_code=201)
async def create_assignment(
    data: AssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = Assignment(**data.model_dump())
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment
