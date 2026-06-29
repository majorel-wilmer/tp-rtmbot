from __future__ import annotations

import hmac
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from vercel_auth import configured_password, create_session_token, session_cookie


class handler(BaseHTTPRequestHandler):
    def redirect(self, location: str, cookie: str = ""):
        self.send_response(303)
        self.send_header("Location", location)
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        form = parse_qs(self.rfile.read(length).decode("utf-8", "ignore"))
        supplied = form.get("password", [""])[0]
        if hmac.compare_digest(supplied, configured_password()):
            self.redirect("/api/data_management", session_cookie(create_session_token()))
        else:
            self.redirect("/login.html?error=1")
