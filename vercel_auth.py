from __future__ import annotations

import hashlib
import hmac
import os
import time
from http.cookies import SimpleCookie

COOKIE_NAME = "vco_rtm_session"
SESSION_TTL_SECONDS = 8 * 60 * 60


def configured_password() -> str:
    return os.environ.get("VCO_RTM_PASSWORD", "VCO-RTM-2026")


def signing_secret() -> bytes:
    value = os.environ.get("VCO_RTM_AUTH_SECRET")
    if value:
        return value.encode("utf-8")
    return hashlib.sha256((configured_password() + ":vco-rtm-auth").encode("utf-8")).digest()


def create_session_token() -> str:
    issued_at = str(int(time.time()))
    signature = hmac.new(signing_secret(), issued_at.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{issued_at}.{signature}"


def is_authenticated(headers) -> bool:
    cookie = SimpleCookie()
    try:
        cookie.load(headers.get("Cookie", ""))
    except Exception:
        return False
    morsel = cookie.get(COOKIE_NAME)
    if not morsel or "." not in morsel.value:
        return False
    issued_at, supplied = morsel.value.split(".", 1)
    try:
        age = time.time() - int(issued_at)
    except ValueError:
        return False
    if age < 0 or age > SESSION_TTL_SECONDS:
        return False
    expected = hmac.new(signing_secret(), issued_at.encode("ascii"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(supplied, expected)


def session_cookie(token: str, clear: bool = False) -> str:
    max_age = 0 if clear else SESSION_TTL_SECONDS
    value = "" if clear else token
    secure = "; Secure" if os.environ.get("VERCEL") else ""
    return f"{COOKIE_NAME}={value}; Path=/; HttpOnly; SameSite=Strict; Max-Age={max_age}{secure}"

