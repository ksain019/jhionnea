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


# ── Character Bible Generator ─────────────────────────────────────────────────


class CharacterBibleRequest(BaseModel):
    name: str
    role: str = "protagonist"
    genre: str = "romance"
    age: str | None = None
    occupation: str | None = None
    novel_title: str | None = None


@router.post("/character-bible")
async def generate_character_bible(
    data: CharacterBibleRequest,
    current_user: User = Depends(get_current_user),
):
    prompt = (
        f"Create a complete Character Bible for a {data.genre} novel "
        f"character named {data.name} (role: {data.role})."
    )
    if data.age:
        prompt += f" Age: {data.age}."
    if data.occupation:
        prompt += f" Occupation: {data.occupation}."
    if data.novel_title:
        prompt += f' Novel: "{data.novel_title}".'
    prompt += (
        "\n\nReturn JSON with:\n"
        '- "overview": 2-sentence character summary\n'
        '- "physical": {height, build, hair, eyes, '
        "distinguishing_features, style}\n"
        '- "personality": {traits: [5], strengths: [3], '
        "flaws: [3], fears: [2], desires: [2]}\n"
        '- "backstory": 3-sentence backstory\n'
        '- "internal_arc": {starts_as, grows_toward, '
        "key_moment, ends_as}\n"
        '- "external_arc": {initial_goal, obstacles: [3], '
        "climax, resolution}\n"
        '- "relationships": [{name, relationship, dynamic}]\n'
        '- "dialogue_style": {voice, speech_patterns, '
        "favorite_phrases: [3], emotional_tells: [3]}"
    )

    ai_result = await _ai_generate(prompt)
    if ai_result:
        try:
            cleaned = ai_result
            if "```json" in cleaned:
                cleaned = cleaned.split("```json")[1].split("```")[0]
            elif "```" in cleaned:
                cleaned = cleaned.split("```")[1].split("```")[0]
            return json.loads(cleaned.strip())
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    return {
        "overview": (
            f"{data.name} is a complex {data.role} in a "
            f"{data.genre} story. Driven by ambition yet "
            f"haunted by the past."
        ),
        "physical": {
            "height": "5'7\"",
            "build": "Athletic",
            "hair": "Dark curly",
            "eyes": "Brown",
            "distinguishing_features": "Small scar on left hand",
            "style": "Professional by day, relaxed by night",
        },
        "personality": {
            "traits": [
                "Determined", "Compassionate", "Guarded",
                "Witty", "Loyal",
            ],
            "strengths": ["Resilience", "Empathy", "Intelligence"],
            "flaws": ["Trust issues", "Overthinking", "Stubbornness"],
            "fears": ["Abandonment", "Failure"],
            "desires": ["True connection", "Professional success"],
        },
        "backstory": (
            f"{data.name} grew up with big dreams but faced "
            f"early setbacks. A defining moment shaped who they "
            f"became. Now they carry both scars and strength."
        ),
        "internal_arc": {
            "starts_as": "Guarded and self-reliant",
            "grows_toward": "Learning to trust and be vulnerable",
            "key_moment": "Chooses love over safety",
            "ends_as": "Open-hearted and whole",
        },
        "external_arc": {
            "initial_goal": "Achieve career milestone",
            "obstacles": [
                "Past relationship resurfaces",
                "Professional rivalry",
                "Family expectations",
            ],
            "climax": "Must choose between career and love",
            "resolution": "Finds a way to have both",
        },
        "relationships": [
            {
                "name": "Love Interest",
                "relationship": "Romantic",
                "dynamic": "Push-pull tension evolving to trust",
            },
            {
                "name": "Best Friend",
                "relationship": "Platonic",
                "dynamic": "Loyal confidant and comic relief",
            },
        ],
        "dialogue_style": {
            "voice": "Quick-witted with underlying warmth",
            "speech_patterns": "Short sentences when guarded, "
            "longer when comfortable",
            "favorite_phrases": [
                "I've got this",
                "That's not how this works",
                "You don't get to decide that for me",
            ],
            "emotional_tells": [
                "Crosses arms when defensive",
                "Looks away when lying",
                "Smiles softly when genuinely happy",
            ],
        },
    }


# ── Scene-by-Scene Plotter ─────────────────────────────────────────────────────


class SceneRequest(BaseModel):
    chapter_number: int
    chapter_title: str | None = None
    pov_character: str | None = None
    scene_goal: str | None = None
    genre: str = "romance"


@router.post("/scene-plotter")
async def plot_scene(
    data: SceneRequest,
    current_user: User = Depends(get_current_user),
):
    prompt = (
        f"Create a detailed scene plan for Chapter {data.chapter_number} "
        f"of a {data.genre} novel."
    )
    if data.chapter_title:
        prompt += f' Title: "{data.chapter_title}".'
    if data.pov_character:
        prompt += f" POV: {data.pov_character}."
    if data.scene_goal:
        prompt += f" Goal: {data.scene_goal}."
    prompt += (
        "\n\nReturn JSON with:\n"
        '- "scene_purpose": why this scene exists\n'
        '- "pov": point of view character\n'
        '- "goal": what the POV character wants\n'
        '- "conflict": what stands in the way\n'
        '- "action": what happens beat by beat (3-5 beats)\n'
        '- "turning_point": the moment everything shifts\n'
        '- "outcome": what changes by scene end\n'
        '- "hook": closing line or moment for next chapter\n'
        '- "sensory_details": [3 key sensory details]\n'
        '- "emotional_arc": {opens_at, peaks_at, closes_at}'
    )

    ai_result = await _ai_generate(prompt)
    if ai_result:
        try:
            cleaned = ai_result
            if "```json" in cleaned:
                cleaned = cleaned.split("```json")[1].split("```")[0]
            elif "```" in cleaned:
                cleaned = cleaned.split("```")[1].split("```")[0]
            return json.loads(cleaned.strip())
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    pov = data.pov_character or "Protagonist"
    return {
        "scene_purpose": "Advance the central relationship dynamic",
        "pov": pov,
        "goal": data.scene_goal or "Connect with love interest",
        "conflict": "Internal resistance meets external pressure",
        "action": [
            f"{pov} arrives at the location with mixed feelings",
            "An unexpected encounter shifts the mood",
            "Tension builds through loaded dialogue",
            "A vulnerable moment breaks through defenses",
            "An interruption leaves things unresolved",
        ],
        "turning_point": (
            f"{pov} realizes feelings are deeper than expected"
        ),
        "outcome": "Emotional walls begin to crack",
        "hook": "A text message changes everything",
        "sensory_details": [
            "The scent of coffee and rain",
            "Warm light from string lights overhead",
            "The brush of fingers reaching for the same thing",
        ],
        "emotional_arc": {
            "opens_at": "Guarded anticipation",
            "peaks_at": "Vulnerable honesty",
            "closes_at": "Hopeful uncertainty",
        },
    }


# ── Series Bible ───────────────────────────────────────────────────────────────


class SeriesBibleRequest(BaseModel):
    series_title: str
    num_books: int = 3
    genre: str = "romance"
    setting: str | None = None
    theme: str | None = None


@router.post("/series-bible")
async def generate_series_bible(
    data: SeriesBibleRequest,
    current_user: User = Depends(get_current_user),
):
    prompt = (
        f"Create a Series Bible for a {data.num_books}-book "
        f'{data.genre} series titled "{data.series_title}".'
    )
    if data.setting:
        prompt += f" Setting: {data.setting}."
    if data.theme:
        prompt += f" Theme: {data.theme}."
    prompt += (
        "\n\nReturn JSON with:\n"
        '- "series_overview": 3-sentence series summary\n'
        '- "timeline": [{book_number, timeframe, key_events}]\n'
        '- "world_rules": [5 rules of the story world]\n'
        '- "character_arcs": [{name, arc_across_series}]\n'
        '- "books": [{book_number, title, protagonist, '
        "love_interest, central_conflict, hook}]\n"
        '- "themes": [3 recurring themes]\n'
        '- "continuity_rules": [5 rules to maintain consistency]'
    )

    ai_result = await _ai_generate(prompt)
    if ai_result:
        try:
            cleaned = ai_result
            if "```json" in cleaned:
                cleaned = cleaned.split("```json")[1].split("```")[0]
            elif "```" in cleaned:
                cleaned = cleaned.split("```")[1].split("```")[0]
            return json.loads(cleaned.strip())
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    setting = data.setting or "a vibrant Southern town"
    books = []
    for i in range(1, data.num_books + 1):
        books.append({
            "book_number": i,
            "title": f"{data.series_title}: Book {i}",
            "protagonist": f"Heroine {i}",
            "love_interest": f"Hero {i}",
            "central_conflict": (
                "Past secrets vs. new beginnings"
                if i == 1
                else "Trust vs. ambition"
                if i == 2
                else "Forgiveness vs. pride"
            ),
            "hook": f"Sets up Book {i + 1}"
            if i < data.num_books
            else "Series conclusion",
        })

    return {
        "series_overview": (
            f"Set in {setting}, the {data.series_title} series "
            f"follows interconnected characters finding love. "
            f"Each book stands alone but threads weave together."
        ),
        "timeline": [
            {
                "book_number": i,
                "timeframe": f"Year {i}",
                "key_events": [
                    "Meet cute", "Crisis", "Resolution",
                ],
            }
            for i in range(1, data.num_books + 1)
        ],
        "world_rules": [
            f"The story is set in {setting}",
            "Characters from previous books appear",
            "Each book has a complete HEA",
            "Shared locations connect the stories",
            "Time passes linearly between books",
        ],
        "character_arcs": [
            {
                "name": f"Character {i}",
                "arc_across_series": (
                    "Side character → protagonist → mentor"
                ),
            }
            for i in range(1, data.num_books + 1)
        ],
        "books": books,
        "themes": [
            "Second chances and redemption",
            "Community and belonging",
            "Self-discovery through love",
        ],
        "continuity_rules": [
            "Keep character ages consistent",
            "Reference events from previous books",
            "Maintain setting descriptions",
            "Track relationship status of all characters",
            "Seasonal timeline must align across books",
        ],
    }


# ── Villain Motivation Generator ───────────────────────────────────────────────


@router.get("/villain-motivations")
async def get_villain_motivations(
    current_user: User = Depends(get_current_user),
):
    return {
        "personal": [
            "Revenge for a past betrayal by the protagonist",
            "Jealousy over the love interest's affection",
            "Desire to prove superiority over a rival",
            "Protecting a secret that could ruin them",
            "Reclaiming something they believe was stolen",
        ],
        "practical": [
            "Financial gain at any cost",
            "Career advancement by eliminating competition",
            "Acquiring property, business, or territory",
            "Maintaining a position of power",
            "Covering up a crime or mistake",
        ],
        "emotional": [
            "Fear of abandonment driving controlling behavior",
            "Grief twisted into destructive obsession",
            "Loneliness masked by manipulation",
            "Unresolved childhood trauma projected onto others",
            "Desperate need for validation and approval",
        ],
        "morally_grey": [
            "Protecting loved ones through questionable means",
            "Believing the ends justify the means for a good cause",
            "Making sacrifices others won't for the greater good",
            "Fighting a broken system with imperfect methods",
            "Choosing between two impossible options",
        ],
    }


# ── Cover Design Checklist ─────────────────────────────────────────────────────


@router.get("/cover-checklist")
async def get_cover_checklist(
    current_user: User = Depends(get_current_user),
):
    return {
        "front_cover": {
            "title": "Clear, readable at thumbnail size",
            "subtitle": "Optional, smaller than title",
            "author_name": "Consistent across all books",
            "imagery": "Genre-appropriate, high resolution",
            "branding": "Series logo if applicable",
            "color_scheme": "Match genre expectations",
        },
        "spine": {
            "title": "Readable at small size",
            "author_name": "Must include",
            "publisher_logo": "Bottom of spine",
            "minimum_width": "Depends on page count",
        },
        "back_cover": {
            "blurb": "4 paragraphs max",
            "author_bio": "2-3 sentences with photo",
            "barcode_area": "ISBN barcode placement",
            "reviews_quotes": "If available",
            "series_info": "Book number in series",
        },
        "technical_specs": {
            "dpi": "300 DPI minimum for print",
            "color_mode_print": "CMYK",
            "color_mode_ebook": "RGB",
            "trim_sizes": [
                "5\" x 8\" (standard paperback)",
                "5.5\" x 8.5\" (trade paperback)",
                "6\" x 9\" (large trade)",
                "8.5\" x 11\" (workbooks)",
            ],
            "bleed": "0.125\" on all sides for print",
            "safe_zone": "0.25\" from trim on all sides",
            "file_format": "PDF for KDP, PNG for ebook cover",
        },
        "ebook_cover": {
            "dimensions": "2560 x 1600 pixels (ideal)",
            "minimum": "1000 x 625 pixels",
            "aspect_ratio": "1.6:1",
            "file_size": "Under 50MB",
            "format": "JPEG or TIFF",
        },
    }


# ── Dialogue Style Guide ──────────────────────────────────────────────────────


@router.get("/dialogue-guide")
async def get_dialogue_guide(
    current_user: User = Depends(get_current_user),
):
    return {
        "principles": {
            "purposeful": (
                "Every line of dialogue must advance plot, "
                "reveal character, or build tension. Cut small "
                "talk unless it serves a purpose."
            ),
            "natural": (
                "Use contractions, interruptions, and incomplete "
                "sentences. Real people don't speak in perfect "
                "paragraphs."
            ),
            "emotional": (
                "Dialogue should reflect the emotional state of "
                "the character. Stress changes speech patterns."
            ),
            "character_specific": (
                "Each character should have a distinct voice. "
                "Readers should be able to tell who's speaking "
                "without tags."
            ),
            "tension_building": (
                "Use subtext — what characters don't say is as "
                "important as what they do. Let readers read "
                "between the lines."
            ),
        },
        "dialogue_tags": {
            "preferred": ["said", "asked", "whispered", "murmured"],
            "use_sparingly": [
                "exclaimed", "declared", "announced",
            ],
            "avoid": [
                "ejaculated", "opined", "stated",
            ],
            "tip": (
                "Use action beats instead of tags when possible: "
                "'She crossed her arms. \"I don't think so.\"'"
            ),
        },
        "formatting_rules": [
            "New speaker = new paragraph",
            "Internal thoughts in italics, no quotes",
            "Interrupted speech ends with em dash (—)",
            "Trailing off ends with ellipsis (...)",
            "Keep monologues under 5 lines",
        ],
        "common_mistakes": [
            "Info-dumping through dialogue",
            "Characters explaining things they both know",
            "All characters sounding the same",
            "Overusing exclamation marks",
            "Phonetic dialect spelling (use word choice instead)",
        ],
    }


# ── Novel Pacing Guide ────────────────────────────────────────────────────────


@router.get("/pacing-guide")
async def get_pacing_guide(
    current_user: User = Depends(get_current_user),
):
    return {
        "structure": {
            "act_1": {
                "percentage": 25,
                "chapters": "1-5",
                "purpose": "Setup, introduce characters, "
                "establish stakes",
                "beats": [
                    "Opening Image (Ch 1)",
                    "Meet Cute (Ch 2)",
                    "Resistance (Ch 3)",
                    "Forced Proximity (Ch 4)",
                    "Growing Attraction (Ch 5)",
                ],
                "pacing": "Moderate — build intrigue",
            },
            "act_2": {
                "percentage": 50,
                "chapters": "6-15",
                "purpose": "Deepen conflict, raise stakes, "
                "test the relationship",
                "beats": [
                    "First Kiss (Ch 6)",
                    "Fun & Games (Ch 7-8)",
                    "Midpoint Shift (Ch 10)",
                    "Raising Stakes (Ch 11-12)",
                    "All Is Lost (Ch 14)",
                    "Dark Night (Ch 15)",
                ],
                "pacing": "Alternating fast/slow — "
                "build and release tension",
            },
            "act_3": {
                "percentage": 25,
                "chapters": "16-20",
                "purpose": "Climax, resolution, HEA",
                "beats": [
                    "Realization (Ch 17)",
                    "Grand Gesture (Ch 18)",
                    "Resolution (Ch 19)",
                    "Final Image (Ch 20)",
                ],
                "pacing": "Fast — momentum to conclusion",
            },
        },
        "word_count_targets": {
            "romance_novel": {
                "total": "60,000-80,000 words",
                "per_chapter": "3,000-4,000 words",
                "act_1": "15,000-20,000 words",
                "act_2": "30,000-40,000 words",
                "act_3": "15,000-20,000 words",
            },
        },
        "tension_curve": [
            {"chapter": 1, "tension": 30, "label": "Opening hook"},
            {"chapter": 3, "tension": 40, "label": "Resistance"},
            {"chapter": 5, "tension": 50, "label": "Attraction"},
            {"chapter": 6, "tension": 60, "label": "First kiss"},
            {"chapter": 8, "tension": 45, "label": "Breathing room"},
            {"chapter": 10, "tension": 65, "label": "Midpoint shift"},
            {"chapter": 12, "tension": 55, "label": "Vulnerability"},
            {"chapter": 14, "tension": 85, "label": "All is lost"},
            {"chapter": 15, "tension": 90, "label": "Dark night"},
            {"chapter": 17, "tension": 70, "label": "Realization"},
            {"chapter": 18, "tension": 80, "label": "Grand gesture"},
            {"chapter": 20, "tension": 95, "label": "HEA resolution"},
        ],
        "scene_pacing_tips": [
            "Short sentences = fast pacing (action, tension)",
            "Long sentences = slow pacing (introspection)",
            "White space on page = breathing room",
            "Dialogue-heavy scenes feel faster",
            "Description-heavy scenes feel slower",
            "End chapters on cliffhangers or questions",
        ],
    }
