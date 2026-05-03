"""Creative generators based on Katia's Master File.

Provides AI-powered generation for:
- KDP metadata (titles, keywords, categories, blurbs)
- Romance novel outlines (beat sheets, 20-chapter outlines)
- Tropes, conflicts, plot twists, villain motivations
- Workbook structures (10 units, worksheets, answer keys)
- Production quota tracking (daily/weekly/monthly)
"""

import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.content import PodcastEpisode, YouTubeProject
from app.models.user import User
from app.models.writing import WritingProject
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/generators", tags=["generators"])


# ── Schemas ────────────────────────────────────────────────────────────────────


class MetadataRequest(BaseModel):
    title: str
    genre: str = "romance"
    subgenre: str | None = None
    tropes: list[str] | None = None


class MetadataResponse(BaseModel):
    title_options: list[str]
    subtitle_options: list[str]
    keywords: list[str]
    categories: list[str]
    blurb: str


class OutlineRequest(BaseModel):
    title: str
    genre: str = "romance"
    trope: str | None = None
    protagonist: str | None = None
    love_interest: str | None = None
    setting: str | None = None


class OutlineResponse(BaseModel):
    beat_sheet: list[dict]
    chapters: list[dict]


class WorkbookRequest(BaseModel):
    subject: str
    grade_level: str
    title: str | None = None


class WorkbookResponse(BaseModel):
    title: str
    grade_level: str
    subject: str
    units: list[dict]
    answer_key_summary: str


class ProductionDashboard(BaseModel):
    daily: dict
    weekly: dict
    monthly: dict


# ── AI Helper ──────────────────────────────────────────────────────────────────


async def _ai_generate(prompt: str) -> str | None:
    """Try OpenAI, fall back to rule-based."""
    if settings.openai_api_key:
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=settings.openai_api_key)
            resp = await client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are Jhionnea, an AI creative assistant for "
                            "Author Katia Saint Pierre. You specialize in "
                            "romance novels, educational workbooks, and KDP "
                            "publishing. Always return structured, actionable "
                            "content. Return valid JSON when asked."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=3000,
                temperature=0.8,
            )
            content = resp.choices[0].message.content
            if content:
                return content.strip()
        except Exception as e:
            logger.warning("OpenAI generation failed: %s", e)
    return None


# ── KDP Metadata Generator ────────────────────────────────────────────────────


ROMANCE_KEYWORDS = [
    "contemporary romance",
    "second chance romance",
    "small town romance",
    "enemies to lovers",
    "friends to lovers",
    "fake dating romance",
    "slow burn romance",
    "forbidden love",
    "interracial romance",
    "BWWM romance",
    "alpha male romance",
    "romantic comedy",
    "steamy romance",
    "clean romance",
    "women's fiction",
]

KDP_CATEGORIES = [
    "Romance > Contemporary",
    "Romance > Multicultural & Interracial",
    "Romance > New Adult & College",
    "Romance > Romantic Comedy",
    "Romance > Clean & Wholesome",
    "Literature & Fiction > Women's Fiction",
    "Literature & Fiction > African American",
]


@router.post("/metadata", response_model=MetadataResponse)
async def generate_metadata(
    data: MetadataRequest,
    current_user: User = Depends(get_current_user),
):
    prompt = (
        f"Generate KDP publishing metadata for a {data.genre} novel "
        f'titled "{data.title}".'
    )
    if data.subgenre:
        prompt += f" Subgenre: {data.subgenre}."
    if data.tropes:
        prompt += f" Tropes: {', '.join(data.tropes)}."
    prompt += (
        "\n\nReturn a JSON object with:\n"
        '- "title_options": 3 alternative title ideas\n'
        '- "subtitle_options": 3 subtitle ideas\n'
        '- "keywords": 7 KDP keywords\n'
        '- "categories": 3 KDP categories\n'
        '- "blurb": a 4-paragraph book blurb (hook, setup, stakes, call to action)'
    )

    ai_result = await _ai_generate(prompt)
    if ai_result:
        try:
            cleaned = ai_result
            if "```json" in cleaned:
                cleaned = cleaned.split("```json")[1].split("```")[0]
            elif "```" in cleaned:
                cleaned = cleaned.split("```")[1].split("```")[0]
            parsed = json.loads(cleaned.strip())
            return MetadataResponse(**parsed)
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    trope_str = data.tropes[0] if data.tropes else "second chance"
    return MetadataResponse(
        title_options=[
            f"{data.title}: A {data.genre.title()} Novel",
            f"The {trope_str.title()} of {data.title}",
            f"{data.title} — When Love Returns",
        ],
        subtitle_options=[
            f"A {trope_str.title()} {data.genre.title()} Story",
            "A Novel of Love, Loss, and Second Chances",
            f"The {data.genre.title()} Novel You Can't Put Down",
        ],
        keywords=ROMANCE_KEYWORDS[:7],
        categories=KDP_CATEGORIES[:3],
        blurb=(
            f"She never expected to see him again. But when {data.title} "
            f"brings them together, old feelings resurface.\n\n"
            f"In this captivating {data.genre} novel, two hearts torn apart "
            f"must decide if the past can be forgiven.\n\n"
            f"With the {trope_str} trope woven throughout, readers will be "
            f"hooked from the first page to the last.\n\n"
            f"Perfect for fans of {data.genre} fiction. "
            f"Grab your copy today!"
        ),
    )


# ── Romance Novel Generator ───────────────────────────────────────────────────


ROMANCE_BEATS = [
    {
        "beat": "Opening Image",
        "chapter": 1,
        "description": "Establish the protagonist's world",
    },
    {
        "beat": "Meet Cute",
        "chapter": 2,
        "description": "First encounter between leads",
    },
    {
        "beat": "Resistance",
        "chapter": 3,
        "description": "Initial reluctance or conflict",
    },
    {
        "beat": "Forced Proximity",
        "chapter": 4,
        "description": "Circumstances push them together",
    },
    {
        "beat": "Growing Attraction",
        "chapter": 5,
        "description": "Chemistry builds despite resistance",
    },
    {
        "beat": "First Touch/Kiss",
        "chapter": 6,
        "description": "Physical connection begins",
    },
    {
        "beat": "Fun & Games",
        "chapter": 7,
        "description": "The promise of the premise",
    },
    {
        "beat": "Deepening Bond",
        "chapter": 8,
        "description": "Emotional intimacy grows",
    },
    {
        "beat": "Midpoint Shift",
        "chapter": 10,
        "description": "Something changes the dynamic",
    },
    {
        "beat": "Raising Stakes",
        "chapter": 11,
        "description": "External pressures mount",
    },
    {
        "beat": "Vulnerability",
        "chapter": 12,
        "description": "One or both open up about past",
    },
    {
        "beat": "All Is Lost",
        "chapter": 14,
        "description": "A major setback threatens all",
    },
    {
        "beat": "Dark Night",
        "chapter": 15,
        "description": "Separation or breakdown",
    },
    {
        "beat": "Realization",
        "chapter": 17,
        "description": "Protagonist sees what matters",
    },
    {
        "beat": "Grand Gesture",
        "chapter": 18,
        "description": "Bold action to win back love",
    },
    {
        "beat": "Resolution",
        "chapter": 19,
        "description": "Conflict resolved, love declared",
    },
    {
        "beat": "Final Image",
        "chapter": 20,
        "description": "Mirror of opening — growth and HEA",
    },
]

TROPES = [
    "Enemies to Lovers", "Friends to Lovers", "Second Chance",
    "Opposites Attract", "Forbidden Love", "Fake Dating",
    "Only One Bed", "Slow Burn", "Healing Romance",
    "Grumpy/Sunshine", "Boss/Employee", "Childhood Sweethearts",
]


@router.post("/novel-outline", response_model=OutlineResponse)
async def generate_novel_outline(
    data: OutlineRequest,
    current_user: User = Depends(get_current_user),
):
    prompt = (
        f"Create a 20-chapter romance novel outline for a novel titled "
        f'"{data.title}" in the {data.genre} genre.'
    )
    if data.trope:
        prompt += f" Primary trope: {data.trope}."
    if data.protagonist:
        prompt += f" Protagonist: {data.protagonist}."
    if data.love_interest:
        prompt += f" Love interest: {data.love_interest}."
    if data.setting:
        prompt += f" Setting: {data.setting}."
    prompt += (
        "\n\nReturn a JSON object with:\n"
        '- "beat_sheet": array of {beat, chapter, description}\n'
        '- "chapters": array of 20 objects with '
        "{chapter_number, title, summary, pov, conflict, hook}"
    )

    ai_result = await _ai_generate(prompt)
    if ai_result:
        try:
            cleaned = ai_result
            if "```json" in cleaned:
                cleaned = cleaned.split("```json")[1].split("```")[0]
            elif "```" in cleaned:
                cleaned = cleaned.split("```")[1].split("```")[0]
            parsed = json.loads(cleaned.strip())
            return OutlineResponse(**parsed)
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    trope = data.trope or "Second Chance"
    protag = data.protagonist or "Maya"
    li = data.love_interest or "Ethan"
    chapters = []
    chapter_templates = [
        f"{protag}'s ordinary world — something is missing",
        f"{protag} meets {li} under unexpected circumstances",
        f"Tension and resistance — {protag} fights the attraction",
        f"Forced together by {data.setting or 'circumstances'} (Plot Twist #1)",
        "Chemistry builds — stolen glances, charged moments",
        "First kiss — everything shifts",
        f"Fun and games — enjoying the {trope.lower()} dynamic",
        "Deepening bond — secrets shared late at night",
        "External pressure threatens what they're building",
        f"Midpoint shift — {li} reveals something unexpected (Plot Twist #2)",
        "Stakes rise — the world pushes back",
        f"Vulnerability — {protag} opens up about her past",
        "Things are perfect... too perfect",
        "All is lost — betrayal or misunderstanding (Plot Twist #3)",
        f"Dark night — {protag} and {li} apart",
        "Reflection — what really matters becomes clear",
        f"Realization — {protag} knows what she must do (Plot Twist #4)",
        f"Grand gesture — {li} proves his love",
        "Resolution — obstacles cleared, love declared",
        "Happily Ever After — mirror of Chapter 1",
    ]
    for i, summary in enumerate(chapter_templates, 1):
        chapters.append({
            "chapter_number": i,
            "title": f"Chapter {i}",
            "summary": summary,
            "pov": protag if i % 2 == 1 else li,
            "conflict": "Internal" if i <= 10 else "External",
            "hook": "Cliffhanger" if i < 20 else "Resolution",
        })

    return OutlineResponse(beat_sheet=ROMANCE_BEATS, chapters=chapters)


@router.get("/tropes")
async def list_tropes(current_user: User = Depends(get_current_user)):
    return {"tropes": TROPES}


@router.get("/conflicts")
async def generate_conflicts(current_user: User = Depends(get_current_user)):
    return {
        "internal": [
            "Fear of vulnerability after past heartbreak",
            "Self-doubt about deserving love",
            "Choosing between career ambition and love",
            "Trust issues from childhood trauma",
            "Fear of repeating parents' mistakes",
        ],
        "external": [
            "Family disapproval of the relationship",
            "Long distance or relocation",
            "Career rivalry between the leads",
            "Secret that could destroy everything",
            "Ex-partner causing interference",
        ],
        "relational": [
            "Different life goals and timelines",
            "Communication breakdown",
            "Power imbalance in the relationship",
            "One is ready to commit, the other isn't",
            "Cultural or social class differences",
        ],
    }


@router.get("/plot-twists")
async def generate_plot_twists(current_user: User = Depends(get_current_user)):
    return {
        "chapter_4": [
            "The love interest is her new boss",
            "They discover they're competing for the same thing",
            "A shared secret from the past is revealed",
        ],
        "chapter_9": [
            "A third person enters the picture",
            "One of them gets an opportunity that requires leaving",
            "A hidden relationship is exposed",
        ],
        "chapter_14": [
            "The protagonist discovers a betrayal",
            "A family emergency forces a choice",
            "The secret she's been keeping comes out",
        ],
        "chapter_17": [
            "An unexpected ally brings them back together",
            "The real villain's motivation is revealed",
            "A sacrifice proves true love",
        ],
    }


# ── Workbook Generator ────────────────────────────────────────────────────────


SUBJECTS = {
    "reading": [
        "Comprehension", "Vocabulary", "Phonics",
        "Fluency", "Writing Prompts",
    ],
    "math": [
        "Number Sense", "Operations", "Geometry",
        "Measurement", "Data & Graphs",
    ],
    "science": [
        "Life Science", "Earth Science", "Physical Science",
        "Scientific Method", "Weather",
    ],
    "art": [
        "Drawing", "Color Theory", "Art History",
        "Mixed Media", "Creative Expression",
    ],
    "cte": [
        "Career Exploration", "Financial Literacy",
        "Digital Citizenship", "Problem Solving", "Teamwork",
    ],
    "health": [
        "Nutrition", "Exercise", "Mental Health",
        "Safety", "Hygiene",
    ],
}


@router.post("/workbook", response_model=WorkbookResponse)
async def generate_workbook(
    data: WorkbookRequest,
    current_user: User = Depends(get_current_user),
):
    subject_lower = data.subject.lower()
    title = data.title or f"{data.grade_level} {data.subject.title()} Workbook"

    prompt = (
        f"Create a detailed workbook structure for a {data.grade_level} "
        f"{data.subject} workbook titled \"{title}\".\n\n"
        f"The workbook must have exactly 10 units with 10-15 worksheets each.\n"
        f"Include: Reading, Math, Science, Art, CTE, Health connections.\n"
        f"Each unit needs an exit ticket.\n\n"
        f"Return JSON with:\n"
        f'- "title": workbook title\n'
        f'- "grade_level": grade\n'
        f'- "subject": subject\n'
        f'- "units": array of 10 objects with '
        f"{{unit_number, title, topic, worksheets: ["
        f"{{worksheet_number, title, type, description}}], "
        f"exit_ticket: {{title, questions: int}}}}\n"
        f'- "answer_key_summary": brief description of answer key structure'
    )

    ai_result = await _ai_generate(prompt)
    if ai_result:
        try:
            cleaned = ai_result
            if "```json" in cleaned:
                cleaned = cleaned.split("```json")[1].split("```")[0]
            elif "```" in cleaned:
                cleaned = cleaned.split("```")[1].split("```")[0]
            parsed = json.loads(cleaned.strip())
            return WorkbookResponse(**parsed)
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    topics = SUBJECTS.get(subject_lower, SUBJECTS["reading"])
    units = []
    for i in range(1, 11):
        topic = topics[(i - 1) % len(topics)]
        worksheets = []
        for w in range(1, 13):
            ws_types = ["practice", "activity", "assessment", "creative"]
            worksheets.append({
                "worksheet_number": w,
                "title": f"{topic} — Worksheet {w}",
                "type": ws_types[(w - 1) % len(ws_types)],
                "description": f"{data.grade_level} level {topic.lower()} exercise",
            })
        units.append({
            "unit_number": i,
            "title": f"Unit {i}: {topic}",
            "topic": topic,
            "worksheets": worksheets,
            "exit_ticket": {
                "title": f"Unit {i} Exit Ticket: {topic}",
                "questions": 5,
            },
        })

    return WorkbookResponse(
        title=title,
        grade_level=data.grade_level,
        subject=data.subject,
        units=units,
        answer_key_summary=(
            f"Answer key includes {10 * 12} worksheet answers organized by unit, "
            f"plus 10 exit ticket answer sheets. "
            f"Covers {data.subject} for {data.grade_level}."
        ),
    )


# ── Production Dashboard ──────────────────────────────────────────────────────


@router.get("/production-dashboard", response_model=ProductionDashboard)
async def get_production_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = datetime.utcnow().date()
    month_start = today.replace(day=1)

    projects_result = await db.execute(
        select(WritingProject).where(
            WritingProject.created_by == current_user.id,
            func.date(WritingProject.created_at) >= month_start,
        )
    )
    projects = projects_result.scalars().all()

    novels = sum(1 for p in projects if p.project_type == "novel")
    workbooks = sum(1 for p in projects if p.project_type == "workbook")

    yt_result = await db.execute(
        select(func.count()).select_from(YouTubeProject).where(
            YouTubeProject.created_by == current_user.id,
            func.date(YouTubeProject.created_at) >= month_start,
        )
    )
    cartoons = yt_result.scalar() or 0

    pod_result = await db.execute(
        select(func.count()).select_from(PodcastEpisode).where(
            PodcastEpisode.created_by == current_user.id,
            func.date(PodcastEpisode.created_at) >= month_start,
        )
    )
    podcasts = pod_result.scalar() or 0

    today_projects = sum(
        1 for p in projects
        if p.created_at and p.created_at.date() == today
    )
    today_cartoons_result = await db.execute(
        select(func.count()).select_from(YouTubeProject).where(
            YouTubeProject.created_by == current_user.id,
            func.date(YouTubeProject.created_at) == today,
        )
    )
    today_cartoons = today_cartoons_result.scalar() or 0

    today_pods_result = await db.execute(
        select(func.count()).select_from(PodcastEpisode).where(
            PodcastEpisode.created_by == current_user.id,
            func.date(PodcastEpisode.created_at) == today,
        )
    )
    today_pods = today_pods_result.scalar() or 0

    week_start = today
    while week_start.weekday() != 0:
        from datetime import timedelta
        week_start -= timedelta(days=1)

    week_projects = sum(
        1 for p in projects
        if p.created_at and p.created_at.date() >= week_start
    )

    return ProductionDashboard(
        daily={
            "cartoons": {"done": today_cartoons, "target": 1},
            "podcasts": {"done": today_pods, "target": 1},
            "shorts": {"done": 0, "target": 1},
            "total_items": today_projects + today_cartoons + today_pods,
        },
        weekly={
            "episodes": {"done": week_projects, "target": 7},
            "total_items": week_projects,
        },
        monthly={
            "novels": {"done": novels, "target": 3},
            "workbooks": {"done": workbooks, "target": 35},
            "notebooks": {"done": 0, "target": 15},
            "episodes": {"done": cartoons + podcasts, "target": 30},
            "total_items": novels + workbooks + cartoons + podcasts,
        },
    )
