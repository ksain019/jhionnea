from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.writing import Episode, WritingProject
from app.schemas.writing import (
    EpisodeCreate,
    EpisodeResponse,
    WritingProjectCreate,
    WritingProjectResponse,
    WritingProjectUpdate,
)
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/writing", tags=["writing"])


@router.get("/projects", response_model=list[WritingProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WritingProject).order_by(WritingProject.updated_at.desc())
    )
    return result.scalars().all()


@router.post("/projects", response_model=WritingProjectResponse, status_code=201)
async def create_project(
    data: WritingProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    word_count = len(data.content.split()) if data.content else 0
    project = WritingProject(
        **data.model_dump(),
        word_count=word_count,
        created_by=current_user.id,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/projects/{project_id}", response_model=WritingProjectResponse)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(WritingProject).where(WritingProject.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/projects/{project_id}", response_model=WritingProjectResponse)
async def update_project(
    project_id: int,
    data: WritingProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(WritingProject).where(WritingProject.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    if data.content is not None:
        project.word_count = len(data.content.split())

    await db.commit()
    await db.refresh(project)
    return project


@router.get("/projects/{project_id}/episodes", response_model=list[EpisodeResponse])
async def list_episodes(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Episode)
        .where(Episode.project_id == project_id)
        .order_by(Episode.episode_number)
    )
    return result.scalars().all()


@router.post("/episodes", response_model=EpisodeResponse, status_code=201)
async def create_episode(
    data: EpisodeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    episode = Episode(**data.model_dump())
    db.add(episode)
    await db.commit()
    await db.refresh(episode)
    return episode


@router.get("/stats")
async def writing_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(WritingProject))
    projects = result.scalars().all()

    stats = {
        "total_projects": len(projects),
        "by_type": {},
        "by_status": {},
        "total_word_count": 0,
    }
    for p in projects:
        stats["by_type"][p.project_type] = stats["by_type"].get(p.project_type, 0) + 1
        stats["by_status"][p.status] = stats["by_status"].get(p.status, 0) + 1
        stats["total_word_count"] += p.word_count

    return stats
