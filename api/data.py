from __future__ import annotations

from http.server import BaseHTTPRequestHandler
from pathlib import Path


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = Path("data") / "actual_data.json"
        if not path.exists():
            self.send_error(404, "Dashboard data is unavailable")
            return
        data = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

