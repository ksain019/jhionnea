from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.chat import ChatMessage
from app.models.user import User
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse, ChatReply
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])

SYSTEM_PROMPT = (
    "You are Jhionnea, a private AI employee. You help with writing, publishing, "
    "teaching, content operations, business management, and analytics. "
    "You are professional, efficient, and proactive."
)


def generate_reply(user_message: str, user_name: str) -> str:
    msg = user_message.lower().strip()

    if any(w in msg for w in ["hello", "hi", "hey", "good morning", "good afternoon"]):
        return (
            f"Hello {user_name}! I'm Jhionnea, your AI employee. "
            "How can I help you today? I can assist with writing projects, "
            "lesson plans, content scheduling, business tracking, and more."
        )

    if any(w in msg for w in ["novel", "write", "book", "story", "fiction"]):
        return (
            "I can help with your writing projects! Here's what I can do:\n\n"
            "- **Generate novel outlines** with chapter breakdowns\n"
            "- **Draft chapters** based on your plot direction\n"
            "- **Create character profiles** and world-building docs\n"
            "- **Format manuscripts** for KDP publishing\n\n"
            "Would you like to start a new project or continue an existing one? "
            "Head over to the **Writing** module to create a project."
        )

    if any(w in msg for w in ["workbook", "lesson", "curriculum", "teach", "grade", "student"]):
        return (
            "I'm ready to help with teaching! I can:\n\n"
            "- **Create standards-aligned curricula** (ELA & Math)\n"
            "- **Generate lesson plans** with objectives and activities\n"
            "- **Grade uploaded assignments** with detailed feedback\n"
            "- **Sick Day Mode**: auto-generate full substitute plans\n\n"
            "Visit the **Teaching** module to get started."
        )

    if any(w in msg for w in ["pocket fm", "medium", "fiverr", "episode", "content", "calendar"]):
        return (
            "I can manage your content operations:\n\n"
            "- **Pocket FM**: Episode drafting and daily stats\n"
            "- **Medium**: Article drafting with SEO optimization\n"
            "- **Fiverr**: Client responses and delivery messages\n"
            "- **Content Calendar**: Unified scheduling across all platforms\n\n"
            "Check the **Content** module for your calendar and drafts."
        )

    if any(w in msg for w in ["money", "income", "bill", "credit", "budget", "financial"]):
        return (
            "Let me help with your finances! I track:\n\n"
            "- **Income** from Pocket FM, KDP, Medium, and Fiverr\n"
            "- **Bills** with due date reminders\n"
            "- **Credit utilization** and cashflow summaries\n"
            "- **Weekly Money Snapshots**\n\n"
            "Head to the **Business** module to log income or view your snapshot."
        )

    if any(w in msg for w in ["stock", "trade", "invest", "sport", "parlay", "odds"]):
        return (
            "I can help with analytics:\n\n"
            "- **Watchlist** tracking for stocks, ETFs, and crypto\n"
            "- **Trade logging** with performance tracking\n"
            "- **Sports analytics** with odds breakdowns\n\n"
            "Visit the **Analytics** module to manage your watchlist and trades."
        )

    if any(w in msg for w in ["help", "what can you do", "capabilities"]):
        return (
            f"Hi {user_name}! I'm Jhionnea, and here's everything I can help with:\n\n"
            "1. **Writing & Publishing** — Novels, workbooks, episodes, scripts\n"
            "2. **Teaching** — Curricula, lesson plans, grading, sick day mode\n"
            "3. **Content Ops** — Pocket FM, Medium, Fiverr, calendars\n"
            "4. **Business & Money** — Income tracking, bills, credit monitoring\n"
            "5. **Analytics** — Stock watchlists, trade logs, sports analysis\n\n"
            "Just tell me what you need and I'll get to work!"
        )

    if any(w in msg for w in ["status", "update", "progress", "report"]):
        return (
            "Here's your current status:\n\n"
            "Check the **Dashboard** for a full overview including:\n"
            "- Active writing projects\n"
            "- Upcoming calendar events\n"
            "- Weekly income summary\n"
            "- Pending bills\n\n"
            "Is there a specific area you'd like a detailed report on?"
        )

    if any(w in msg for w in ["thank", "thanks", "appreciate"]):
        return (
            f"You're welcome, {user_name}! I'm always here when you need me. "
            "Just send a message anytime."
        )

    return (
        f"Got it, {user_name}. I'm processing your request. "
        "You can ask me about writing, teaching, content, business, or analytics. "
        "Or try asking me something specific like:\n\n"
        '- "Help me plan a new novel"\n'
        '- "Create a lesson plan for 3rd grade math"\n'
        '- "What\'s my income this month?"\n'
        '- "Schedule content for next week"'
    )


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
    user_msg = ChatMessage(
        role="user",
        content=data.content,
        user_id=current_user.id,
    )
    db.add(user_msg)
    await db.flush()
    await db.refresh(user_msg)

    reply_text = generate_reply(data.content, current_user.full_name)
    assistant_msg = ChatMessage(
        role="assistant",
        content=reply_text,
        user_id=current_user.id,
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(assistant_msg)

    return ChatReply(user_message=user_msg, assistant_message=assistant_msg)
