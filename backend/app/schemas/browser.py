from pydantic import BaseModel


class BrowserActionRequest(BaseModel):
    action: str  # navigate, screenshot, click, type, search, scroll, get_text
    url: str | None = None
    selector: str | None = None
    text: str | None = None
    query: str | None = None
    direction: str | None = None


class BrowserActionResponse(BaseModel):
    success: bool
    action: str
    url: str = ""
    title: str = ""
    screenshot_b64: str = ""
    text_content: str = ""
    error: str = ""
