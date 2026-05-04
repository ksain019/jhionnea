"""Automation service for Jhionnea 24/7 operations.

Provides:
- Scheduled task execution (daily/weekly/monthly)
- Health monitoring and auto-recovery
- Error recovery with retry logic
- Database backup
- Performance monitoring
"""

import asyncio
import logging
import os
import shutil
import time
from datetime import datetime, timezone

logger = logging.getLogger("jhionnea.automation")

# ── Health Monitor ─────────────────────────────────────────────────────────────

_health_status: dict[str, dict] = {
    "database": {"status": "unknown", "last_check": None},
    "openai": {"status": "unknown", "last_check": None},
    "gmail": {"status": "unknown", "last_check": None},
    "elevenlabs": {"status": "unknown", "last_check": None},
}

_performance_metrics: list[dict] = []
MAX_METRICS = 1000


async def check_database_health() -> bool:
    """Verify database is accessible."""
    try:
        from sqlalchemy import text

        from app.database import async_session
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        _health_status["database"] = {
            "status": "healthy",
            "last_check": datetime.now(timezone.utc).isoformat(),
        }
        return True
    except Exception as e:
        _health_status["database"] = {
            "status": "unhealthy",
            "error": str(e),
            "last_check": datetime.now(timezone.utc).isoformat(),
        }
        logger.error("Database health check failed: %s", e)
        return False


async def check_openai_health() -> bool:
    """Verify OpenAI API is accessible."""
    from app.config import settings
    if not settings.openai_api_key:
        _health_status["openai"] = {
            "status": "not_configured",
            "last_check": datetime.now(timezone.utc).isoformat(),
        }
        return False
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        await client.models.list()
        _health_status["openai"] = {
            "status": "healthy",
            "last_check": datetime.now(timezone.utc).isoformat(),
        }
        return True
    except Exception as e:
        _health_status["openai"] = {
            "status": "unhealthy",
            "error": str(e),
            "last_check": datetime.now(timezone.utc).isoformat(),
        }
        logger.error("OpenAI health check failed: %s", e)
        return False


async def run_health_checks() -> dict:
    """Run all health checks."""
    await check_database_health()
    await check_openai_health()
    return _health_status.copy()


# ── Performance Monitoring ─────────────────────────────────────────────────────


def record_metric(endpoint: str, duration_ms: float, status_code: int):
    """Record a performance metric."""
    _performance_metrics.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "endpoint": endpoint,
        "duration_ms": round(duration_ms, 2),
        "status_code": status_code,
    })
    if len(_performance_metrics) > MAX_METRICS:
        _performance_metrics.pop(0)


def get_performance_summary() -> dict:
    """Get performance summary."""
    if not _performance_metrics:
        return {"total_requests": 0}

    durations = [m["duration_ms"] for m in _performance_metrics]
    errors = sum(
        1 for m in _performance_metrics if m["status_code"] >= 400
    )
    return {
        "total_requests": len(_performance_metrics),
        "avg_response_ms": round(sum(durations) / len(durations), 2),
        "max_response_ms": round(max(durations), 2),
        "min_response_ms": round(min(durations), 2),
        "error_count": errors,
        "error_rate": round(
            errors / len(_performance_metrics) * 100, 2
        ),
        "uptime_since": (
            _performance_metrics[0]["timestamp"]
            if _performance_metrics
            else None
        ),
    }


# ── Error Recovery ─────────────────────────────────────────────────────────────

_error_counts: dict[str, int] = {}
MAX_RETRIES = 3


async def with_retry(func, *args, retries: int = MAX_RETRIES, **kwargs):
    """Execute a function with automatic retry on failure."""
    last_error = None
    for attempt in range(retries):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            last_error = e
            func_name = getattr(func, "__name__", str(func))
            _error_counts[func_name] = (
                _error_counts.get(func_name, 0) + 1
            )
            logger.warning(
                "Retry %d/%d for %s: %s",
                attempt + 1, retries, func_name, e,
            )
            if attempt < retries - 1:
                await asyncio.sleep(2 ** attempt)
    raise last_error  # type: ignore[misc]


def get_error_summary() -> dict:
    """Get error counts by function."""
    return _error_counts.copy()


# ── Database Backup ────────────────────────────────────────────────────────────


def create_backup() -> str | None:
    """Create a database backup."""
    data_dir = "/data" if os.path.isdir("/data") else "."
    db_path = os.path.join(data_dir, "jhionnea.db")

    if not os.path.exists(db_path):
        logger.warning("Database file not found at %s", db_path)
        return None

    backup_dir = os.path.join(data_dir, "backups")
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(backup_dir, f"jhionnea_{timestamp}.db")

    shutil.copy2(db_path, backup_path)
    logger.info("Database backup created: %s", backup_path)

    # Keep only last 5 backups
    backups = sorted(
        [
            os.path.join(backup_dir, f)
            for f in os.listdir(backup_dir)
            if f.startswith("jhionnea_") and f.endswith(".db")
        ]
    )
    while len(backups) > 5:
        os.remove(backups.pop(0))
        logger.info("Removed old backup")

    return backup_path


def list_backups() -> list[dict]:
    """List available backups."""
    data_dir = "/data" if os.path.isdir("/data") else "."
    backup_dir = os.path.join(data_dir, "backups")
    if not os.path.isdir(backup_dir):
        return []

    backups = []
    for f in sorted(os.listdir(backup_dir)):
        if f.startswith("jhionnea_") and f.endswith(".db"):
            path = os.path.join(backup_dir, f)
            stat = os.stat(path)
            backups.append({
                "filename": f,
                "size_mb": round(stat.st_size / 1024 / 1024, 2),
                "created": datetime.fromtimestamp(
                    stat.st_mtime, tz=timezone.utc
                ).isoformat(),
            })
    return backups


# ── Task Scheduler ─────────────────────────────────────────────────────────────

_scheduled_tasks: list[dict] = []
_task_log: list[dict] = []
MAX_TASK_LOG = 500


def register_task(
    name: str,
    schedule: str,
    description: str,
):
    """Register a scheduled task.

    schedule: 'daily', 'weekly', 'monthly'
    """
    _scheduled_tasks.append({
        "name": name,
        "schedule": schedule,
        "description": description,
        "last_run": None,
        "next_run": None,
        "status": "registered",
    })


def log_task_execution(name: str, success: bool, details: str = ""):
    """Log a task execution result."""
    _task_log.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "task": name,
        "success": success,
        "details": details,
    })
    if len(_task_log) > MAX_TASK_LOG:
        _task_log.pop(0)


def get_scheduled_tasks() -> list[dict]:
    """Get all registered tasks."""
    return _scheduled_tasks.copy()


def get_task_log(limit: int = 50) -> list[dict]:
    """Get recent task execution log."""
    return _task_log[-limit:]


# ── Initialize Default Tasks ──────────────────────────────────────────────────

register_task(
    "daily_backup",
    "daily",
    "Create database backup",
)
register_task(
    "daily_health_check",
    "daily",
    "Run health checks on all services",
)
register_task(
    "daily_content_reminder",
    "daily",
    "Check daily production quotas "
    "(1 cartoon, 1 podcast, 1 short)",
)
register_task(
    "weekly_analytics",
    "weekly",
    "Generate weekly content analytics "
    "and production report",
)
register_task(
    "monthly_production_review",
    "monthly",
    "Review monthly quotas "
    "(3 novels, 35 workbooks, 15 notebooks, 30 episodes)",
)


# ── Startup Timer ──────────────────────────────────────────────────────────────

_start_time = time.time()


def get_uptime() -> dict:
    """Get system uptime information."""
    elapsed = time.time() - _start_time
    hours = int(elapsed // 3600)
    minutes = int((elapsed % 3600) // 60)
    seconds = int(elapsed % 60)
    return {
        "uptime_seconds": round(elapsed),
        "uptime_formatted": f"{hours}h {minutes}m {seconds}s",
        "started_at": datetime.fromtimestamp(
            _start_time, tz=timezone.utc
        ).isoformat(),
    }
