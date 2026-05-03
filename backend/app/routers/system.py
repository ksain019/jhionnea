"""System management endpoints for monitoring and automation."""

from fastapi import APIRouter, Depends

from app.middleware.security import get_audit_log
from app.models.user import User
from app.services.automation import (
    create_backup,
    get_error_summary,
    get_performance_summary,
    get_scheduled_tasks,
    get_task_log,
    get_uptime,
    list_backups,
    run_health_checks,
)
from app.utils.auth import require_boss

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/health-check")
async def detailed_health_check(
    current_user: User = Depends(require_boss),
):
    """Run comprehensive health checks on all services."""
    health = await run_health_checks()
    uptime = get_uptime()
    performance = get_performance_summary()
    return {
        "services": health,
        "uptime": uptime,
        "performance": performance,
    }


@router.get("/audit-log")
async def view_audit_log(
    limit: int = 100,
    current_user: User = Depends(require_boss),
):
    """View recent security audit log entries."""
    return {"entries": get_audit_log(limit)}


@router.get("/performance")
async def view_performance(
    current_user: User = Depends(require_boss),
):
    """View performance metrics summary."""
    return get_performance_summary()


@router.get("/errors")
async def view_errors(
    current_user: User = Depends(require_boss),
):
    """View error counts by function."""
    return get_error_summary()


@router.post("/backup")
async def trigger_backup(
    current_user: User = Depends(require_boss),
):
    """Create a database backup."""
    path = create_backup()
    if path:
        return {"status": "success", "backup_path": path}
    return {"status": "error", "detail": "Database file not found"}


@router.get("/backups")
async def view_backups(
    current_user: User = Depends(require_boss),
):
    """List available database backups."""
    return {"backups": list_backups()}


@router.get("/scheduled-tasks")
async def view_scheduled_tasks(
    current_user: User = Depends(require_boss),
):
    """View registered scheduled tasks."""
    return {"tasks": get_scheduled_tasks()}


@router.get("/task-log")
async def view_task_log(
    limit: int = 50,
    current_user: User = Depends(require_boss),
):
    """View recent task execution log."""
    return {"entries": get_task_log(limit)}


@router.get("/uptime")
async def view_uptime(
    current_user: User = Depends(require_boss),
):
    """View system uptime."""
    return get_uptime()
