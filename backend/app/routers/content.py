import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.content import CalendarEvent, ContentDraft, PodcastEpisode, YouTubeProject
from app.models.user import User
from app.schemas.content import (
    CalendarEventCreate,
    CalendarEventResponse,
    ContentDraftCreate,
    ContentDraftResponse,
    PodcastEpisodeCreate,
    PodcastEpisodeResponse,
    YouTubeProjectCreate,
    YouTubeProjectResponse,
)
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/content", tags=["content"])


# ── Calendar ───────────────────────────────────────────────────────────────────

@router.get("/calendar", response_model=list[CalendarEventResponse])
async def list_calendar_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CalendarEvent).order_by(CalendarEvent.scheduled_date)
    )
    return result.scalars().all()


@router.post("/calendar", response_model=CalendarEventResponse, status_code=201)
async def create_calendar_event(
    data: CalendarEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = CalendarEvent(**data.model_dump(), created_by=current_user.id)
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


# ── Content Drafts ─────────────────────────────────────────────────────────────

@router.get("/drafts", response_model=list[ContentDraftResponse])
async def list_drafts(
    platform: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(ContentDraft).order_by(ContentDraft.created_at.desc())
    if platform:
        query = query.where(ContentDraft.platform == platform)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/drafts", response_model=ContentDraftResponse, status_code=201)
async def create_draft(
    data: ContentDraftCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    draft = ContentDraft(**data.model_dump(), created_by=current_user.id)
    db.add(draft)
    await db.commit()
    await db.refresh(draft)
    return draft


# ── YouTube Projects ───────────────────────────────────────────────────────────

@router.get("/youtube", response_model=list[YouTubeProjectResponse])
async def list_youtube_projects(
    project_type: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(YouTubeProject).order_by(YouTubeProject.created_at.desc())
    if project_type:
        query = query.where(YouTubeProject.project_type == project_type)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/youtube", response_model=YouTubeProjectResponse, status_code=201)
async def create_youtube_project(
    data: YouTubeProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = YouTubeProject(**data.model_dump(), created_by=current_user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/youtube/{project_id}", response_model=YouTubeProjectResponse)
async def get_youtube_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(YouTubeProject).where(YouTubeProject.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="YouTube project not found")
    return project


@router.post("/youtube/{project_id}/generate-script", response_model=YouTubeProjectResponse)
async def generate_youtube_script(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(YouTubeProject).where(YouTubeProject.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="YouTube project not found")

    project.script = _generate_youtube_script(project)
    project.storyboard = _generate_storyboard(project)
    project.status = "scripting"
    await db.commit()
    await db.refresh(project)
    return project


# ── Podcast Episodes ───────────────────────────────────────────────────────────

@router.get("/podcast", response_model=list[PodcastEpisodeResponse])
async def list_podcast_episodes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PodcastEpisode).order_by(PodcastEpisode.created_at.desc())
    )
    return result.scalars().all()


@router.post("/podcast", response_model=PodcastEpisodeResponse, status_code=201)
async def create_podcast_episode(
    data: PodcastEpisodeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    episode = PodcastEpisode(**data.model_dump(), created_by=current_user.id)
    db.add(episode)
    await db.commit()
    await db.refresh(episode)
    return episode


@router.get("/podcast/{episode_id}", response_model=PodcastEpisodeResponse)
async def get_podcast_episode(
    episode_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PodcastEpisode).where(PodcastEpisode.id == episode_id)
    )
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="Podcast episode not found")
    return episode


@router.post("/podcast/{episode_id}/generate-script", response_model=PodcastEpisodeResponse)
async def generate_podcast_script(
    episode_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PodcastEpisode).where(PodcastEpisode.id == episode_id)
    )
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="Podcast episode not found")

    episode.script = _generate_podcast_script(episode)
    episode.status = "scripted"
    await db.commit()
    await db.refresh(episode)
    return episode


@router.post("/podcast/{episode_id}/generate-audio")
async def generate_podcast_audio(
    episode_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=400,
            detail="OpenAI API key not configured. Set JHIONNEA_OPENAI_API_KEY to enable TTS.",
        )

    result = await db.execute(
        select(PodcastEpisode).where(PodcastEpisode.id == episode_id)
    )
    episode = result.scalar_one_or_none()
    if not episode:
        raise HTTPException(status_code=404, detail="Podcast episode not found")
    if not episode.script:
        raise HTTPException(status_code=400, detail="Generate a script first before creating audio")

    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.openai_api_key)
        tts_input = episode.script[:4096]
        response = await client.audio.speech.create(
            model=settings.openai_tts_model,
            voice=settings.openai_tts_voice,
            input=tts_input,
        )
        episode.status = "audio_ready"
        await db.commit()

        async def audio_stream():
            async for chunk in response.response.aiter_bytes():
                yield chunk

        return StreamingResponse(
            audio_stream(),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f'attachment; filename="{episode.title}.mp3"'
            },
        )
    except Exception as e:
        logger.error("TTS generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Audio generation failed: {e}")


@router.get("/tts-status")
async def tts_status(current_user: User = Depends(get_current_user)):
    return {
        "enabled": bool(settings.openai_api_key),
        "model": settings.openai_tts_model,
        "voice": settings.openai_tts_voice,
    }


# ── Social Media Scheduler ─────────────────────────────────────────────────────

@router.get("/social-posts")
async def list_social_posts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.content import SocialPost

    result = await db.execute(
        select(SocialPost).order_by(SocialPost.scheduled_date.desc())
    )
    posts = result.scalars().all()
    return [
        {
            "id": p.id,
            "platform": p.platform,
            "content": p.content,
            "media_url": p.media_url,
            "scheduled_date": p.scheduled_date.isoformat() if p.scheduled_date else None,
            "status": p.status,
            "post_url": p.post_url,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in posts
    ]


@router.post("/social-posts", status_code=201)
async def create_social_post(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import datetime

    from app.models.content import SocialPost

    scheduled = None
    if data.get("scheduled_date"):
        scheduled = datetime.fromisoformat(data["scheduled_date"].replace("Z", "+00:00"))

    post = SocialPost(
        platform=data.get("platform", ""),
        content=data.get("content", ""),
        media_url=data.get("media_url"),
        scheduled_date=scheduled,
        status="scheduled" if scheduled else "draft",
        created_by=current_user.id,
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return {
        "id": post.id,
        "platform": post.platform,
        "content": post.content,
        "media_url": post.media_url,
        "scheduled_date": post.scheduled_date.isoformat() if post.scheduled_date else None,
        "status": post.status,
        "created_at": post.created_at.isoformat() if post.created_at else None,
    }


# ── Medium Publishing ──────────────────────────────────────────────────────────

@router.post("/medium/publish")
async def publish_to_medium(
    data: dict,
    current_user: User = Depends(get_current_user),
):
    if not settings.medium_token:
        raise HTTPException(
            status_code=400,
            detail="Medium token not configured. Set JHIONNEA_MEDIUM_TOKEN.",
        )

    import httpx

    async with httpx.AsyncClient() as client:
        me_resp = await client.get(
            "https://api.medium.com/v1/me",
            headers={"Authorization": f"Bearer {settings.medium_token}"},
        )
        if me_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid Medium token")
        user_id = me_resp.json()["data"]["id"]

        post_data = {
            "title": data.get("title", "Untitled"),
            "contentFormat": data.get("format", "markdown"),
            "content": data.get("content", ""),
            "publishStatus": data.get("status", "draft"),
            "tags": data.get("tags", []),
        }
        pub_resp = await client.post(
            f"https://api.medium.com/v1/users/{user_id}/posts",
            headers={
                "Authorization": f"Bearer {settings.medium_token}",
                "Content-Type": "application/json",
            },
            json=post_data,
        )
        if pub_resp.status_code not in (200, 201):
            raise HTTPException(
                status_code=pub_resp.status_code,
                detail=f"Medium API error: {pub_resp.text}",
            )
        return pub_resp.json()


@router.get("/medium/status")
async def medium_status(current_user: User = Depends(get_current_user)):
    return {"enabled": bool(settings.medium_token)}


# ── Script Generation Helpers ──────────────────────────────────────────────────

def _generate_youtube_script(project: YouTubeProject) -> str:
    type_label = project.project_type.replace("_", " ").title()
    age_note = f" (Target audience: {project.target_age})" if project.target_age else ""
    ep_info = ""
    if project.season and project.episode_number:
        ep_info = f"Season {project.season}, Episode {project.episode_number}"

    return f"""# {project.title}
**Type:** {type_label}{age_note}
{f'**{ep_info}**' if ep_info else ''}
**Duration:** {project.duration_minutes} minutes

---

## INTRO (0:00 - 0:30)
[Animated logo and theme music]
NARRATOR: "Welcome back to {project.channel_name or 'our channel'}!"
NARRATOR: "Today we're going to learn about {project.topic or project.title}!"

[Colorful animated characters appear]

## SEGMENT 1 - Introduction ({project.duration_minutes // 5} min)
[Animated scene: Characters discover the topic]
NARRATOR: "Have you ever wondered about {project.topic or 'this topic'}? Let's find out together!"

CHARACTER 1: "I'm so excited to learn about this!"
CHARACTER 2: "Me too! Let's go on an adventure!"

## SEGMENT 2 - Main Content ({project.duration_minutes // 2} min)
[Educational content with animated visuals]
NARRATOR: "Here's what you need to know..."

[Key teaching points with fun animations]
- Point 1: [Main concept explained simply]
- Point 2: [Supporting detail with example]
- Point 3: [Fun fact or interesting connection]

## SEGMENT 3 - Activity/Quiz ({project.duration_minutes // 4} min)
[Interactive segment]
NARRATOR: "Now it's your turn! Can you answer these questions?"

Q1: [Question about the topic]
Q2: [Another question]
Q3: [Challenge question]

## OUTRO (0:30)
NARRATOR: "Great job today! You learned so much about {project.topic or project.title}!"
[Subscribe reminder, next episode preview]
"Don't forget to subscribe and hit the bell! See you next time!"

[End screen with suggested videos]
"""


def _generate_storyboard(project: YouTubeProject) -> str:
    return f"""# Storyboard: {project.title}

## Scene 1 - Opening
- **Visual:** Animated logo with bright colors
- **Audio:** Upbeat theme music
- **Duration:** 15 seconds

## Scene 2 - Character Introduction
- **Visual:** Main characters wave at camera
- **Audio:** Narrator introduces the episode
- **Duration:** 15 seconds

## Scene 3 - Topic Introduction
- **Visual:** Topic title appears with fun animation
- **Audio:** Narrator asks opening question about {project.topic or 'the topic'}
- **Duration:** {project.duration_minutes // 5} minutes

## Scene 4 - Main Teaching
- **Visual:** Animated diagrams, charts, and character interactions
- **Audio:** Narrator explains key concepts
- **Duration:** {project.duration_minutes // 2} minutes

## Scene 5 - Interactive Quiz
- **Visual:** Quiz questions appear on screen with timer
- **Audio:** Fun quiz music
- **Duration:** {project.duration_minutes // 4} minutes

## Scene 6 - Closing
- **Visual:** Characters celebrate, subscribe button
- **Audio:** Closing music
- **Duration:** 30 seconds
"""


def _generate_podcast_script(episode: PodcastEpisode) -> str:
    style_note = {
        "professional": "Speak clearly and authoritatively",
        "casual": "Use a friendly, conversational tone",
        "energetic": "Be enthusiastic and dynamic",
    }.get(episode.voice_style, "Speak naturally")

    return f"""# Podcast Script: {episode.title}
**Show:** {episode.show_name or 'Podcast'}
{f'**Episode {episode.episode_number}**' if episode.episode_number else ''}
**Duration:** ~{episode.duration_minutes} minutes
**Voice Direction:** {style_note}

---

## INTRO (1-2 minutes)
[Theme music fades in]

"Hello and welcome to {episode.show_name or 'the show'}!"
"I'm your host, and today we're diving into {episode.topic or episode.title}."

"Before we get started, please subscribe and leave a review."
"It really helps us reach more people."

## SEGMENT 1 - Setting the Stage (5 minutes)
"So let us talk about {episode.topic or 'this topic'}..."

[Provide context and background]
- Why this topic matters
- Current state of affairs
- What listeners should know

## SEGMENT 2 - Deep Dive ({episode.duration_minutes // 2} minutes)
"Now let's get into the details..."

[Main content discussion]
- Key point 1: [Detailed explanation]
- Key point 2: [Examples and stories]
- Key point 3: [Expert insights or research]

## SEGMENT 3 - Practical Takeaways (5 minutes)
"So what does this mean for you?"

[Actionable advice]
1. First takeaway
2. Second takeaway
3. Third takeaway

## OUTRO (1-2 minutes)
"That's all for today's episode. Thank you so much for listening!"

"If you have thoughts on today's topic, reach out to us on social media."

"Until next time, take care and keep learning!"

[Theme music fades out]

---

## PRODUCTION NOTES
- Record in quiet environment
- Use AI voice with '{episode.voice_style}' style
- Add intro/outro music
- Include chapter markers at each segment
"""
