import asyncio
import base64
import logging
from dataclasses import dataclass, field
from urllib.parse import quote_plus

logger = logging.getLogger(__name__)


@dataclass
class BrowserResult:
    success: bool
    action: str
    url: str = ""
    title: str = ""
    screenshot_b64: str = ""
    text_content: str = ""
    error: str = ""


@dataclass
class BrowserSession:
    _playwright: object = field(default=None, repr=False)
    _browser: object = field(default=None, repr=False)
    _context: object = field(default=None, repr=False)
    _page: object = field(default=None, repr=False)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    async def _ensure_browser(self):
        if self._page is not None:
            try:
                if not self._page.is_closed():
                    return self._page
            except Exception:
                pass

        try:
            from playwright.async_api import async_playwright
        except ImportError:
            raise RuntimeError(
                "Playwright is not installed. Browser features are unavailable."
            )

        pw = await async_playwright().start()
        self._playwright = pw
        self._browser = await pw.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        self._context = await self._browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        self._page = await self._context.new_page()
        return self._page

    async def navigate(self, url: str) -> BrowserResult:
        async with self._lock:
            try:
                page = await self._ensure_browser()
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                screenshot = await page.screenshot(type="jpeg", quality=70)
                return BrowserResult(
                    success=True,
                    action="navigate",
                    url=page.url,
                    title=await page.title(),
                    screenshot_b64=base64.b64encode(screenshot).decode(),
                )
            except Exception as e:
                logger.error("Navigate failed: %s", e)
                return BrowserResult(
                    success=False, action="navigate", error=str(e)
                )

    async def screenshot(self) -> BrowserResult:
        async with self._lock:
            try:
                page = await self._ensure_browser()
                screenshot = await page.screenshot(type="jpeg", quality=70)
                return BrowserResult(
                    success=True,
                    action="screenshot",
                    url=page.url,
                    title=await page.title(),
                    screenshot_b64=base64.b64encode(screenshot).decode(),
                )
            except Exception as e:
                return BrowserResult(
                    success=False, action="screenshot", error=str(e)
                )

    async def click(self, selector: str) -> BrowserResult:
        async with self._lock:
            try:
                page = await self._ensure_browser()
                await page.click(selector, timeout=10000)
                await page.wait_for_load_state("domcontentloaded")
                screenshot = await page.screenshot(type="jpeg", quality=70)
                return BrowserResult(
                    success=True,
                    action="click",
                    url=page.url,
                    title=await page.title(),
                    screenshot_b64=base64.b64encode(screenshot).decode(),
                )
            except Exception as e:
                return BrowserResult(
                    success=False, action="click", error=str(e)
                )

    async def type_text(
        self, selector: str, text: str
    ) -> BrowserResult:
        async with self._lock:
            try:
                page = await self._ensure_browser()
                await page.fill(selector, text, timeout=10000)
                screenshot = await page.screenshot(type="jpeg", quality=70)
                return BrowserResult(
                    success=True,
                    action="type",
                    url=page.url,
                    title=await page.title(),
                    screenshot_b64=base64.b64encode(screenshot).decode(),
                )
            except Exception as e:
                return BrowserResult(
                    success=False, action="type", error=str(e)
                )

    async def get_text(self, selector: str = "body") -> BrowserResult:
        async with self._lock:
            try:
                page = await self._ensure_browser()
                el = await page.query_selector(selector)
                text = await el.inner_text() if el else ""
                if len(text) > 5000:
                    text = text[:5000] + "..."
                return BrowserResult(
                    success=True,
                    action="get_text",
                    url=page.url,
                    title=await page.title(),
                    text_content=text,
                )
            except Exception as e:
                return BrowserResult(
                    success=False, action="get_text", error=str(e)
                )

    async def search(self, query: str) -> BrowserResult:
        url = f"https://www.google.com/search?q={quote_plus(query)}"
        result = await self.navigate(url)
        if result.success:
            result.action = "search"
            text_result = await self.get_text("#search")
            result.text_content = text_result.text_content
        return result

    async def scroll(self, direction: str = "down") -> BrowserResult:
        async with self._lock:
            try:
                page = await self._ensure_browser()
                amount = 500 if direction == "down" else -500
                await page.evaluate(f"window.scrollBy(0, {amount})")
                await asyncio.sleep(0.5)
                screenshot = await page.screenshot(type="jpeg", quality=70)
                return BrowserResult(
                    success=True,
                    action="scroll",
                    url=page.url,
                    title=await page.title(),
                    screenshot_b64=base64.b64encode(screenshot).decode(),
                )
            except Exception as e:
                return BrowserResult(
                    success=False, action="scroll", error=str(e)
                )

    async def close(self):
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()


# Singleton session
browser_session = BrowserSession()
