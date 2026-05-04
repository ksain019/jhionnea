"""Security middleware for Jhionnea.

Provides:
- Rate limiting per IP and per user
- Input sanitization (XSS, injection prevention)
- Security headers (HSTS, CSP, X-Frame-Options, etc.)
- PII scrubbing from logs
- Request/response audit logging
- Suspicious activity detection
"""

import hashlib
import logging
import re
import time
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("jhionnea.security")

# ── Rate Limiter ───────────────────────────────────────────────────────────────

_rate_store: dict[str, list[float]] = defaultdict(list)
_block_store: dict[str, float] = {}

RATE_LIMITS = {
    "default": (60, 60),       # 60 requests per 60 seconds
    "login": (5, 60),          # 5 login attempts per 60 seconds
    "generators": (20, 60),    # 20 generator calls per 60 seconds
    "chat": (30, 60),          # 30 chat messages per 60 seconds
}

BLOCK_DURATION = 300  # 5 minutes block after exceeding limits


def _get_rate_key(request: Request) -> tuple[str, str]:
    """Get rate limit key and category for a request."""
    ip = request.client.host if request.client else "unknown"
    path = request.url.path

    if "/auth/login" in path:
        category = "login"
    elif "/generators/" in path:
        category = "generators"
    elif "/chat/" in path:
        category = "chat"
    else:
        category = "default"

    return f"{ip}:{category}", category


def check_rate_limit(request: Request) -> bool:
    """Returns True if request is allowed, False if rate-limited."""
    key, category = _get_rate_key(request)
    now = time.time()

    if key in _block_store:
        if now < _block_store[key]:
            return False
        del _block_store[key]

    max_requests, window = RATE_LIMITS.get(category, RATE_LIMITS["default"])

    _rate_store[key] = [
        t for t in _rate_store[key] if now - t < window
    ]

    if len(_rate_store[key]) >= max_requests:
        _block_store[key] = now + BLOCK_DURATION
        logger.warning(
            "Rate limit exceeded for %s (category: %s). "
            "Blocked for %d seconds.",
            key, category, BLOCK_DURATION,
        )
        return False

    _rate_store[key].append(now)
    return True


# ── Input Sanitization ─────────────────────────────────────────────────────────

XSS_PATTERNS = [
    re.compile(r"<script\b", re.IGNORECASE),
    re.compile(r"javascript:", re.IGNORECASE),
    re.compile(r"on\w+\s*=", re.IGNORECASE),
    re.compile(r"<iframe\b", re.IGNORECASE),
    re.compile(r"<object\b", re.IGNORECASE),
    re.compile(r"<embed\b", re.IGNORECASE),
    re.compile(r"expression\s*\(", re.IGNORECASE),
    re.compile(r"url\s*\(\s*data:", re.IGNORECASE),
]

SQL_PATTERNS = [
    re.compile(r";\s*(DROP|DELETE|ALTER|TRUNCATE)\s", re.IGNORECASE),
    re.compile(r"UNION\s+(ALL\s+)?SELECT", re.IGNORECASE),
    re.compile(r"'\s*OR\s+'1'\s*=\s*'1", re.IGNORECASE),
    re.compile(r"--\s*$", re.MULTILINE),
]

PATH_TRAVERSAL = re.compile(r"\.\./|\.\.\\")


def detect_malicious_input(text: str) -> str | None:
    """Check text for XSS, SQL injection, and path traversal.
    Returns the threat type if detected, None if clean.
    """
    for pattern in XSS_PATTERNS:
        if pattern.search(text):
            return "xss"
    for pattern in SQL_PATTERNS:
        if pattern.search(text):
            return "sql_injection"
    if PATH_TRAVERSAL.search(text):
        return "path_traversal"
    return None


# ── PII Scrubbing ──────────────────────────────────────────────────────────────

PII_PATTERNS = [
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "[SSN_REDACTED]"),
    (re.compile(r"\b\d{16}\b"), "[CARD_REDACTED]"),
    (re.compile(
        r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b"
    ), "[CARD_REDACTED]"),
    (re.compile(r"sk-[a-zA-Z0-9_-]{20,}"), "[API_KEY_REDACTED]"),
    (re.compile(r"password[\"':\s]*[\"']?[^\s\"',}{]{4,}",
                re.IGNORECASE), "[PASSWORD_REDACTED]"),
]


def scrub_pii(text: str) -> str:
    """Remove PII from text for safe logging."""
    result = text
    for pattern, replacement in PII_PATTERNS:
        result = pattern.sub(replacement, result)
    return result


# ── Audit Logger ───────────────────────────────────────────────────────────────

_audit_log: list[dict] = []
MAX_AUDIT_LOG = 10000


def log_audit_event(
    action: str,
    ip: str,
    user: str | None = None,
    details: str = "",
    risk_level: str = "low",
):
    """Log an auditable event."""
    event = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "ip": hashlib.sha256(ip.encode()).hexdigest()[:12],
        "user": user,
        "details": scrub_pii(details) if details else "",
        "risk_level": risk_level,
    }
    _audit_log.append(event)
    if len(_audit_log) > MAX_AUDIT_LOG:
        _audit_log.pop(0)

    if risk_level in ("high", "critical"):
        logger.warning("SECURITY AUDIT [%s]: %s — %s",
                        risk_level.upper(), action, event["details"])
    else:
        logger.info("AUDIT [%s]: %s", action, event["details"][:100])


def get_audit_log(limit: int = 100) -> list[dict]:
    """Get recent audit log entries."""
    return _audit_log[-limit:]


# ── Security Middleware ────────────────────────────────────────────────────────


class SecurityMiddleware(BaseHTTPMiddleware):
    """Comprehensive security middleware."""

    async def dispatch(self, request: Request, call_next) -> Response:
        ip = request.client.host if request.client else "unknown"
        path = request.url.path

        # Skip health checks
        if path == "/api/health":
            return await call_next(request)

        # Rate limiting
        if not check_rate_limit(request):
            log_audit_event(
                "rate_limit_blocked", ip,
                details=f"Path: {path}",
                risk_level="high",
            )
            return Response(
                content='{"detail":"Rate limit exceeded. '
                'Try again later."}',
                status_code=429,
                media_type="application/json",
            )

        # Check query parameters for malicious input
        for key, value in request.query_params.items():
            threat = detect_malicious_input(value)
            if threat:
                log_audit_event(
                    "malicious_input_blocked", ip,
                    details=f"Type: {threat}, param: {key}",
                    risk_level="critical",
                )
                return Response(
                    content='{"detail":"Invalid input detected."}',
                    status_code=400,
                    media_type="application/json",
                )

        # Log the request
        log_audit_event(
            "request", ip,
            details=f"{request.method} {path}",
            risk_level="low",
        )

        # Process request
        response = await call_next(request)

        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = (
            "strict-origin-when-cross-origin"
        )
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        response.headers["Cache-Control"] = (
            "no-store" if "/api/" in path else "public, max-age=3600"
        )

        # Log failed auth attempts
        if response.status_code == 401 and "/auth/login" in path:
            log_audit_event(
                "failed_login", ip,
                details="Failed login attempt",
                risk_level="medium",
            )

        return response
