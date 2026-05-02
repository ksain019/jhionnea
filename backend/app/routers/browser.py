from fastapi import APIRouter, Depends

from app.models.user import User
from app.schemas.browser import BrowserActionRequest, BrowserActionResponse
from app.services.browser import browser_session
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/browser", tags=["browser"])


@router.post("/action", response_model=BrowserActionResponse)
async def perform_action(
    req: BrowserActionRequest,
    current_user: User = Depends(get_current_user),
):
    if req.action == "navigate" and req.url:
        result = await browser_session.navigate(req.url)
    elif req.action == "screenshot":
        result = await browser_session.screenshot()
    elif req.action == "click" and req.selector:
        result = await browser_session.click(req.selector)
    elif req.action == "type" and req.selector and req.text:
        result = await browser_session.type_text(req.selector, req.text)
    elif req.action == "search" and req.query:
        result = await browser_session.search(req.query)
    elif req.action == "scroll":
        result = await browser_session.scroll(req.direction or "down")
    elif req.action == "get_text":
        result = await browser_session.get_text(req.selector or "body")
    else:
        return BrowserActionResponse(
            success=False,
            action=req.action,
            error=f"Invalid action or missing params: {req.action}",
        )

    return BrowserActionResponse(
        success=result.success,
        action=result.action,
        url=result.url,
        title=result.title,
        screenshot_b64=result.screenshot_b64,
        text_content=result.text_content,
        error=result.error,
    )
