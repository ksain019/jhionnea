import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.email import EmailLog, EmailRule
from app.models.user import User
from app.schemas.email import (
    EmailAnalyzeRequest,
    EmailLogResponse,
    EmailRuleCreate,
    EmailRuleResponse,
)
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/email", tags=["email"])

COMMON_SPAM_PATTERNS = [
    r"unsubscribe",
    r"no.?reply",
    r"newsletter",
    r"promotional",
    r"limited.time.offer",
    r"act.now",
    r"click.here",
    r"congratulations.*won",
    r"free.gift",
    r"earn.*money.*fast",
]

IMPORTANT_PATTERNS = [
    r"invoice",
    r"receipt",
    r"payment",
    r"appointment",
    r"meeting",
    r"deadline",
    r"urgent",
    r"action.required",
    r"password.reset",
    r"verification",
    r"school",
    r"teacher",
    r"grade",
    r"student",
]


@router.get("/rules", response_model=list[EmailRuleResponse])
async def list_rules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EmailRule)
        .where(EmailRule.created_by == current_user.id)
        .order_by(EmailRule.created_at.desc())
    )
    return result.scalars().all()


@router.post("/rules", response_model=EmailRuleResponse, status_code=201)
async def create_rule(
    data: EmailRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rule = EmailRule(**data.model_dump(), created_by=current_user.id)
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EmailRule).where(EmailRule.id == rule_id, EmailRule.created_by == current_user.id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    await db.delete(rule)
    await db.commit()
    return {"detail": "Rule deleted"}


@router.put("/rules/{rule_id}/toggle", response_model=EmailRuleResponse)
async def toggle_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EmailRule).where(EmailRule.id == rule_id, EmailRule.created_by == current_user.id)
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    rule.is_active = not rule.is_active
    await db.commit()
    await db.refresh(rule)
    return rule


@router.get("/logs", response_model=list[EmailLogResponse])
async def list_logs(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EmailLog)
        .where(EmailLog.created_by == current_user.id)
        .order_by(EmailLog.processed_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.post("/analyze")
async def analyze_emails(
    data: EmailAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rules_result = await db.execute(
        select(EmailRule).where(
            EmailRule.created_by == current_user.id,
            EmailRule.is_active.is_(True),
        )
    )
    rules = rules_result.scalars().all()

    results = []
    for email_data in data.emails:
        sender = email_data.get("from", "")
        subject = email_data.get("subject", "")
        body = email_data.get("body", "")
        labels = email_data.get("labels", [])

        action, reason, matched_rule_id = _classify_email(
            sender, subject, body, labels, rules
        )

        log = EmailLog(
            email_from=sender,
            email_subject=subject,
            action_taken=action,
            rule_id=matched_rule_id,
            reason=reason,
            created_by=current_user.id,
        )
        db.add(log)

        results.append({
            "from": sender,
            "subject": subject,
            "action": action,
            "reason": reason,
        })

    await db.commit()
    return {"results": results, "total": len(results)}


def _classify_email(
    sender: str,
    subject: str,
    body: str,
    labels: list[str],
    rules: list[EmailRule],
) -> tuple[str, str, int | None]:
    full_text = f"{sender} {subject} {body}".lower()

    for rule in rules:
        field_map = {
            "from": sender.lower(),
            "subject": subject.lower(),
            "body": body.lower(),
            "label": " ".join(labels).lower(),
        }
        check_text = field_map.get(rule.condition_field, full_text)
        if rule.condition_value.lower() in check_text:
            return rule.rule_type, f"Matched rule: {rule.name}", rule.id

    for pattern in IMPORTANT_PATTERNS:
        if re.search(pattern, full_text, re.IGNORECASE):
            return "keep", f"Important: matches '{pattern}' pattern", None

    for pattern in COMMON_SPAM_PATTERNS:
        if re.search(pattern, full_text, re.IGNORECASE):
            return "delete", f"Likely unimportant: matches '{pattern}' pattern", None

    return "keep", "No matching rule — kept by default", None
