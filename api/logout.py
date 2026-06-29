from __future__ import annotations

import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from vercel_auth import session_cookie


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        self.send_response(303)
        self.send_header("Location", "/login.html")
        self.send_header("Set-Cookie", session_cookie("", clear=True))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", "0")
        self.end_headers()

