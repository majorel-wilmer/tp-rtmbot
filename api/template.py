from __future__ import annotations

import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from vercel_auth import is_authenticated


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if not is_authenticated(self.headers):
            self.send_response(303)
            self.send_header("Location", "/login.html")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        filename = "VCO_RTM_Bot_Upload_Template.xlsx"
        path = Path("outputs") / filename
        if not path.exists():
            path = Path(filename)
        if not path.exists():
            self.send_error(404, "Upload template is unavailable")
            return
        data = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        self.send_header("Content-Disposition", 'attachment; filename="VCO_RTM_Bot_Upload_Template.xlsx"')
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
