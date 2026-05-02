from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

# Import all models so they are registered with Base.metadata
import app.models.analytics  # noqa: F401
import app.models.business  # noqa: F401
import app.models.content  # noqa: F401
import app.models.teaching  # noqa: F401
import app.models.writing  # noqa: F401
from app.config import settings
from app.database import async_session, engine
from app.models.base import Base
from app.models.user import User
from app.routers import analytics, auth, business, content, dashboard, teaching, writing
from app.utils.auth import hash_password


async def seed_users():
    async with async_session() as session:
        result = await session.execute(select(User).where(User.username == "katia"))
        if result.scalar_one_or_none() is None:
            katia = User(
                username="katia",
                hashed_password=hash_password("katia2025"),
                full_name="Katia",
                role="boss",
            )
            stanley = User(
                username="stanley",
                hashed_password=hash_password("stanley2025"),
                full_name="Stanley",
                role="user",
            )
            session.add_all([katia, stanley])
            await session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_users()
    yield


app = FastAPI(
    title=settings.app_name,
    description="Private AI Employee System",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(writing.router)
app.include_router(teaching.router)
app.include_router(content.router)
app.include_router(business.router)
app.include_router(analytics.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": settings.app_name}
