from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.documents import DocumentProject
from app.models.user import User
from app.schemas.documents import DocumentCreate, DocumentResponse, FormatRequest
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("/", response_model=list[DocumentResponse])
async def list_documents(
    doc_type: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(DocumentProject).order_by(DocumentProject.created_at.desc())
    if doc_type:
        query = query.where(DocumentProject.doc_type == doc_type)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=DocumentResponse, status_code=201)
async def create_document(
    data: DocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    word_count = len(data.content.split()) if data.content else 0
    page_count = max(1, word_count // 250)

    doc = DocumentProject(
        **data.model_dump(),
        word_count=word_count,
        page_count=page_count,
        created_by=current_user.id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DocumentProject).where(DocumentProject.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.post("/{doc_id}/format", response_model=DocumentResponse)
async def format_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(DocumentProject).where(DocumentProject.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not doc.content:
        raise HTTPException(status_code=400, detail="Document has no content to format")

    doc.formatted_content = _apply_formatting(doc.content, doc.format_style, doc.doc_type)
    doc.word_count = len(doc.content.split())
    doc.page_count = max(1, doc.word_count // 250)
    doc.status = "formatted"
    await db.commit()
    await db.refresh(doc)
    return doc


@router.post("/format-preview")
async def preview_format(
    data: FormatRequest,
    current_user: User = Depends(get_current_user),
):
    formatted = _apply_formatting(data.content, data.format_style, data.doc_type)
    return {
        "formatted_content": formatted,
        "word_count": len(data.content.split()),
        "page_count": max(1, len(data.content.split()) // 250),
        "format_style": data.format_style,
    }


def _apply_formatting(content: str, style: str, doc_type: str) -> str:
    lines = content.strip().split("\n")
    formatted_lines = []

    if style == "apa":
        formatted_lines.append("=" * 60)
        formatted_lines.append(f"  {doc_type.upper()} — APA Format")
        formatted_lines.append("=" * 60)
        formatted_lines.append("")
        for line in lines:
            stripped = line.strip()
            if not stripped:
                formatted_lines.append("")
            elif stripped.startswith("#"):
                heading = stripped.lstrip("# ").strip()
                formatted_lines.append(f"\n{heading}")
                formatted_lines.append("-" * len(heading))
            else:
                formatted_lines.append(f"    {stripped}")

    elif style == "mla":
        formatted_lines.append("[Author Name]")
        formatted_lines.append("[Instructor Name]")
        formatted_lines.append("[Course Name]")
        formatted_lines.append("[Date]")
        formatted_lines.append("")
        for line in lines:
            stripped = line.strip()
            if not stripped:
                formatted_lines.append("")
            elif stripped.startswith("#"):
                heading = stripped.lstrip("# ").strip()
                formatted_lines.append(f"\n{heading}")
            else:
                formatted_lines.append(f"    {stripped}")

    elif style == "chicago":
        formatted_lines.append("")
        formatted_lines.append(f"{'=' * 60}")
        formatted_lines.append(f"  {doc_type.upper()}")
        formatted_lines.append(f"{'=' * 60}")
        formatted_lines.append("")
        for line in lines:
            stripped = line.strip()
            if not stripped:
                formatted_lines.append("")
            elif stripped.startswith("#"):
                heading = stripped.lstrip("# ").strip()
                formatted_lines.append(f"\n  {heading.upper()}")
                formatted_lines.append("")
            else:
                formatted_lines.append(f"  {stripped}")

    else:
        formatted_lines = lines

    formatted_lines.append("")
    formatted_lines.append(f"--- Formatted in {style.upper()} style ---")

    return "\n".join(formatted_lines)
