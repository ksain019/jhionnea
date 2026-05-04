"""Global search across all content."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.writing import WritingProject
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("")
async def search_all(
    q: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search across all content types."""
    results: list[dict] = []
    query = q.lower()

    # Search writing projects
    stmt = select(WritingProject).where(
        WritingProject.user_id == current_user.id
    )
    res = await db.execute(stmt)
    projects = res.scalars().all()
    for p in projects:
        if (
            query in (p.title or "").lower()
            or query in (p.genre or "").lower()
            or query in (p.status or "").lower()
        ):
            results.append({
                "type": "writing",
                "id": p.id,
                "title": p.title,
                "subtitle": f"{p.genre} — {p.status}",
                "link": "/dashboard/writing",
            })

    # Search teaching (students)
    try:
        from app.models.teaching import Student

        stmt_s = select(Student).where(
            Student.user_id == current_user.id
        )
        res_s = await db.execute(stmt_s)
        students = res_s.scalars().all()
        for s in students:
            if query in (s.name or "").lower() or query in (
                s.grade_level or ""
            ).lower():
                results.append({
                    "type": "student",
                    "id": s.id,
                    "title": s.name,
                    "subtitle": f"Grade {s.grade_level}",
                    "link": "/dashboard/teaching",
                })
    except Exception:
        pass

    # Search content
    try:
        from app.models.content import ContentItem

        stmt_c = select(ContentItem).where(
            ContentItem.user_id == current_user.id
        )
        res_c = await db.execute(stmt_c)
        content_items = res_c.scalars().all()
        for c in content_items:
            if (
                query in (c.title or "").lower()
                or query in (c.content_type or "").lower()
            ):
                results.append({
                    "type": "content",
                    "id": c.id,
                    "title": c.title,
                    "subtitle": c.content_type,
                    "link": "/dashboard/content",
                })
    except Exception:
        pass

    # Search documents
    try:
        from app.models.documents import Document

        stmt_d = select(Document).where(
            Document.user_id == current_user.id
        )
        res_d = await db.execute(stmt_d)
        docs = res_d.scalars().all()
        for d in docs:
            if (
                query in (d.title or "").lower()
                or query in (d.content or "").lower()
            ):
                results.append({
                    "type": "document",
                    "id": d.id,
                    "title": d.title,
                    "subtitle": f"{d.doc_type} — {d.format_style}",
                    "link": "/dashboard/documents",
                })
    except Exception:
        pass

    # Search business (income, bills)
    try:
        from app.models.business import IncomeEntry

        stmt_i = select(IncomeEntry).where(
            IncomeEntry.user_id == current_user.id
        )
        res_i = await db.execute(stmt_i)
        incomes = res_i.scalars().all()
        for inc in incomes:
            if query in (inc.source or "").lower() or query in (
                inc.description or ""
            ).lower():
                results.append({
                    "type": "income",
                    "id": inc.id,
                    "title": f"${inc.amount} — {inc.source}",
                    "subtitle": inc.description or "",
                    "link": "/dashboard/business",
                })
    except Exception:
        pass

    return {
        "query": q,
        "total": len(results),
        "results": results[:50],
    }
