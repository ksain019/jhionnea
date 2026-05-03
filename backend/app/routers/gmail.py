import logging
import secrets
import time

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/gmail", tags=["gmail"])

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
]

_tokens: dict[int, dict] = {}
_pending_states: dict[str, tuple[int, float]] = {}


@router.get("/status")
async def gmail_status(current_user: User = Depends(get_current_user)):
    connected = current_user.id in _tokens
    return {
        "configured": bool(settings.gmail_client_id and settings.gmail_client_secret),
        "connected": connected,
    }


@router.get("/auth-url")
async def gmail_auth_url(current_user: User = Depends(get_current_user)):
    if not settings.gmail_client_id:
        raise HTTPException(
            status_code=400,
            detail="Gmail not configured. Set JHIONNEA_GMAIL_CLIENT_ID"
            " and JHIONNEA_GMAIL_CLIENT_SECRET.",
        )
    redirect_uri = settings.gmail_redirect_uri or "http://localhost:8000/api/gmail/callback"
    state_token = secrets.token_urlsafe(32)
    _pending_states[state_token] = (current_user.id, time.time())
    params = {
        "client_id": settings.gmail_client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state_token,
    }
    query = "&".join(f"{k}={httpx.URL('', params={k: v}).params[k]}" for k, v in params.items())
    url = f"https://accounts.google.com/o/oauth2/v2/auth?{query}"
    return {"auth_url": url}


@router.get("/callback")
async def gmail_callback(code: str, state: str = ""):
    if not settings.gmail_client_id:
        raise HTTPException(status_code=400, detail="Gmail not configured")

    pending = _pending_states.pop(state, None)
    if not pending:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")
    user_id, created_at = pending
    if time.time() - created_at > 600:
        raise HTTPException(status_code=400, detail="OAuth state expired")

    redirect_uri = settings.gmail_redirect_uri or "http://localhost:8000/api/gmail/callback"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.gmail_client_id,
                "client_secret": settings.gmail_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail=f"OAuth error: {resp.text}")

        token_data = resp.json()
        _tokens[user_id] = token_data
        logger.info("Gmail connected for user %d", user_id)

    return RedirectResponse(url="/dashboard/email?gmail=connected")


async def _get_gmail_headers(user_id: int) -> dict[str, str]:
    token_data = _tokens.get(user_id)
    if not token_data:
        raise HTTPException(status_code=401, detail="Gmail not connected. Authorize first.")

    if "refresh_token" in token_data:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.gmail_client_id,
                    "client_secret": settings.gmail_client_secret,
                    "refresh_token": token_data["refresh_token"],
                    "grant_type": "refresh_token",
                },
            )
            if resp.status_code == 200:
                new_data = resp.json()
                token_data["access_token"] = new_data["access_token"]
                _tokens[user_id] = token_data

    return {"Authorization": f'Bearer {token_data["access_token"]}'}


@router.get("/inbox")
async def get_inbox(
    max_results: int = 20,
    current_user: User = Depends(get_current_user),
):
    headers = await _get_gmail_headers(current_user.id)

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults={max_results}",
            headers=headers,
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)

        messages_list = resp.json().get("messages", [])
        emails = []
        for msg_ref in messages_list[:max_results]:
            msg_resp = await client.get(
                f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_ref['id']}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date",
                headers=headers,
            )
            if msg_resp.status_code == 200:
                msg_data = msg_resp.json()
                headers_data = {
                    h["name"]: h["value"]
                    for h in msg_data.get("payload", {}).get("headers", [])
                }
                emails.append({
                    "id": msg_data["id"],
                    "thread_id": msg_data.get("threadId"),
                    "from": headers_data.get("From", ""),
                    "subject": headers_data.get("Subject", "(no subject)"),
                    "date": headers_data.get("Date", ""),
                    "snippet": msg_data.get("snippet", ""),
                    "labels": msg_data.get("labelIds", []),
                })

        return {"emails": emails, "total": len(emails)}


@router.delete("/messages/{message_id}")
async def delete_email(
    message_id: str,
    current_user: User = Depends(get_current_user),
):
    headers = await _get_gmail_headers(current_user.id)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}/trash",
            headers=headers,
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return {"detail": "Email moved to trash"}


@router.post("/messages/{message_id}/star")
async def star_email(
    message_id: str,
    current_user: User = Depends(get_current_user),
):
    headers = await _get_gmail_headers(current_user.id)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}/modify",
            headers=headers,
            json={"addLabelIds": ["STARRED"]},
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return {"detail": "Email starred"}


@router.post("/auto-clean")
async def auto_clean_inbox(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    headers = await _get_gmail_headers(current_user.id)

    from app.models.email import EmailRule  # noqa: E402

    rules_result = await db.execute(
        select(EmailRule).where(
            EmailRule.created_by == current_user.id,
            EmailRule.is_active.is_(True),
        )
    )
    rules = rules_result.scalars().all()

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50",
            headers=headers,
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)

        messages = resp.json().get("messages", [])
        deleted = 0
        kept = 0

        for msg_ref in messages:
            msg_resp = await client.get(
                f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_ref['id']}?format=metadata&metadataHeaders=From&metadataHeaders=Subject",
                headers=headers,
            )
            if msg_resp.status_code != 200:
                continue

            msg_data = msg_resp.json()
            hdrs = {
                h["name"]: h["value"]
                for h in msg_data.get("payload", {}).get("headers", [])
            }
            sender = hdrs.get("From", "")
            subject = hdrs.get("Subject", "")

            from app.routers.email_mgmt import _classify_email  # noqa: E402
            action, reason, _ = _classify_email(
                sender, subject, "", msg_data.get("labelIds", []), rules
            )

            if action == "delete":
                await client.post(
                    f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_ref['id']}/trash",
                    headers=headers,
                )
                deleted += 1
            else:
                kept += 1

    return {"deleted": deleted, "kept": kept, "total": deleted + kept}
