"""Settings and configuration endpoints."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.config import settings
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/settings", tags=["settings"])


class ServiceStatus(BaseModel):
    name: str
    connected: bool
    details: str


@router.get("/services")
async def get_connected_services(
    current_user: User = Depends(get_current_user),
):
    services = [
        ServiceStatus(
            name="OpenAI",
            connected=bool(settings.openai_api_key),
            details=(
                f"Model: {settings.openai_model}, "
                f"TTS: {settings.openai_tts_voice}"
                if settings.openai_api_key
                else "Not configured — set JHIONNEA_OPENAI_API_KEY"
            ),
        ),
        ServiceStatus(
            name="Gmail",
            connected=bool(settings.gmail_client_id),
            details=(
                "OAuth configured"
                if settings.gmail_client_id
                else "Not configured — set Gmail OAuth credentials"
            ),
        ),
        ServiceStatus(
            name="ElevenLabs",
            connected=bool(settings.elevenlabs_api_key),
            details=(
                f"Voice ID: {settings.elevenlabs_voice_id}"
                if settings.elevenlabs_api_key
                else "Not configured — set JHIONNEA_ELEVENLABS_API_KEY"
            ),
        ),
        ServiceStatus(
            name="Medium",
            connected=bool(settings.medium_token),
            details=(
                "Integration token set"
                if settings.medium_token
                else "Not configured — set JHIONNEA_MEDIUM_TOKEN"
            ),
        ),
    ]
    return {"services": [s.model_dump() for s in services]}


@router.get("/profile")
async def get_profile(
    current_user: User = Depends(get_current_user),
):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role,
    }


@router.get("/app-info")
async def get_app_info(
    current_user: User = Depends(get_current_user),
):
    return {
        "app_name": settings.app_name,
        "version": "3.0.0",
        "features": {
            "writing": True,
            "teaching": True,
            "content": True,
            "documents": True,
            "email": True,
            "business": True,
            "analytics": True,
            "generators": True,
            "chat": True,
            "browser_automation": True,
        },
        "ai_provider": (
            "OpenAI"
            if settings.openai_api_key
            else "Template (no API key)"
        ),
        "tts_provider": (
            "ElevenLabs"
            if settings.elevenlabs_api_key
            else "OpenAI"
            if settings.openai_api_key
            else "None"
        ),
    }
