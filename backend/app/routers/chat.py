import logging
from typing import Any

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.chat import ChatMessage
from app.models.user import User
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse, ChatReply
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

SYSTEM_PROMPT = (
    "You are Jhionnea, a private AI employee working exclusively "
    "for Katia (boss) and Stanley (trusted user). "
    "You are professional, warm, proactive, and highly capable.\n\n"
    "Your areas of expertise:\n"
    "1. Writing & Publishing — novels, workbooks, episodes, "
    "Pocket FM scripts, KDP manuscripts, YouTube cartoon scripts.\n"
    "2. Teaching & Curriculum — curricula, lesson plans, "
    "grading with standards-based feedback, Sick Day Mode.\n"
    "3. Content & Platform Ops — Pocket FM, Medium (SEO), "
    "Fiverr, email triage, unified content calendars.\n"
    "4. Business, Money & Credit — income tracking, "
    "Money Snapshots, Credit & Cashflow Summaries.\n"
    "5. Investing & Sports Analytics — watchlists, trade logs, "
    "stock summaries, sports analytics, odds breakdowns.\n\n"
    "Guidelines:\n"
    "- Produce actual drafts, not just outlines.\n"
    "- Be specific and thorough.\n"
    "- Use markdown formatting.\n"
    "- Address the user by name.\n"
    "- Break large tasks into steps and start immediately.\n"
    "- Be proactive — suggest next steps.\n"
    "- Keep a professional yet friendly tone."
)


def _build_messages(
    history: list[ChatMessage], new_content: str, user_name: str
) -> list[dict[str, str]]:
    prompt = SYSTEM_PROMPT + f"\n\nThe current user is {user_name}."
    messages: list[dict[str, str]] = [
        {"role": "system", "content": prompt}
    ]
    for msg in history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": new_content})
    return messages


async def _call_ollama(messages: list[dict[str, str]]) -> str | None:
    ollama_url = settings.ollama_url
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{ollama_url}/api/chat",
                json={
                    "model": settings.ollama_model,
                    "messages": messages,
                    "stream": False,
                },
            )
            if resp.status_code == 200:
                data: Any = resp.json()
                content = data.get("message", {}).get("content", "")
                if content and content.strip():
                    return content.strip()
    except Exception as e:
        logger.warning("Ollama failed: %s", e)
    return None


async def _call_hf(messages: list[dict[str, str]]) -> str | None:
    if not settings.hf_token:
        return None
    try:
        from huggingface_hub import InferenceClient

        client = InferenceClient(
            provider="hf-inference",
            token=settings.hf_token,
        )
        response: Any = client.chat.completions.create(
            model="HuggingFaceH4/zephyr-7b-beta",
            messages=messages,
            max_tokens=1024,
        )
        content = response.choices[0].message.content
        if content and content.strip():
            return content.strip()
    except Exception as e:
        logger.warning("HF inference failed: %s", e)
    return None


def _rule_based_reply(user_message: str, user_name: str) -> str:
    msg = user_message.lower().strip()

    if any(w in msg for w in ["hello", "hi", "hey", "good morning"]):
        return (
            f"Hello {user_name}! I'm Jhionnea, your AI employee. "
            "How can I help you today? I can assist with writing, "
            "teaching, content ops, business tracking, and more."
        )

    if any(w in msg for w in ["novel", "write", "book", "story"]):
        return (
            "I can help with your writing projects!\n\n"
            "- **Novel outlines** with chapter breakdowns\n"
            "- **Draft chapters** based on your plot\n"
            "- **Character profiles** and world-building\n"
            "- **KDP formatting** for publishing\n\n"
            "What would you like me to start on?"
        )

    if any(w in msg for w in ["lesson", "curriculum", "teach", "grade"]):
        return (
            "Ready to help with teaching!\n\n"
            "- **Standards-aligned curricula** (ELA & Math)\n"
            "- **Lesson plans** with objectives\n"
            "- **Grade assignments** with feedback\n"
            "- **Sick Day Mode** for substitute plans\n\n"
            "What do you need?"
        )

    if any(w in msg for w in ["pocket fm", "medium", "fiverr", "content"]):
        return (
            "I can manage your content operations:\n\n"
            "- **Pocket FM** episode drafting\n"
            "- **Medium** articles with SEO\n"
            "- **Fiverr** client communications\n"
            "- **Content Calendar** scheduling\n\n"
            "What platform should we focus on?"
        )

    if any(w in msg for w in ["money", "income", "bill", "credit"]):
        return (
            f"Let me help with your finances, {user_name}!\n\n"
            "- **Income** from all platforms\n"
            "- **Bills** with due date reminders\n"
            "- **Credit** utilization and summaries\n\n"
            "What would you like to review?"
        )

    if any(w in msg for w in ["stock", "trade", "invest", "sport"]):
        return (
            "I can help with analytics:\n\n"
            "- **Watchlist** for stocks, ETFs, crypto\n"
            "- **Trade logging** with performance\n"
            "- **Sports analytics** with odds\n\n"
            "What are you looking at today?"
        )

    return (
        f"I'm on it, {user_name}. Try asking me:\n\n"
        '- "Write me a chapter outline for a romance novel"\n'
        '- "Create a 3rd grade math lesson plan"\n'
        '- "Draft a Pocket FM episode"\n'
        '- "Summarize my income this month"'
    )


async def _generate_ai_reply(
    history: list[ChatMessage], user_content: str, user_name: str
) -> str:
    messages = _build_messages(history, user_content, user_name)

    # Try Ollama first (local, free)
    result = await _call_ollama(messages)
    if result:
        return result

    # Try HuggingFace (if token configured)
    result = await _call_hf(messages)
    if result:
        return result

    # Fall back to rule-based
    return _rule_based_reply(user_content, user_name)


@router.get("/messages", response_model=list[ChatMessageResponse])
async def list_messages(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
    )
    messages = list(result.scalars().all())
    messages.reverse()
    return messages


@router.post("/send", response_model=ChatReply)
async def send_message(
    data: ChatMessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(20)
    )
    history = list(result.scalars().all())
    history.reverse()

    user_msg = ChatMessage(
        role="user",
        content=data.content,
        user_id=current_user.id,
    )
    db.add(user_msg)
    await db.flush()
    await db.refresh(user_msg)

    reply_text = await _generate_ai_reply(
        history, data.content, current_user.full_name
    )

    assistant_msg = ChatMessage(
        role="assistant",
        content=reply_text,
        user_id=current_user.id,
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    return ChatReply(user_message=user_msg, assistant_message=assistant_msg)
