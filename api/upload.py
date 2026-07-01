from __future__ import annotations

import json
import re
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from server import parse_workbook
from vercel_auth import is_authenticated

PRODUCTION_ORIGIN = "https://tp-rtmbot.vercel.app"


def is_dashboard_request(headers) -> bool:
    origin = headers.get("Origin", "").rstrip("/")
    fetch_site = headers.get("Sec-Fetch-Site", "")
    return origin == PRODUCTION_ORIGIN and fetch_site in {"same-origin", "same-site"}


class handler(BaseHTTPRequestHandler):
    def send_json(self, status: int, payload: dict):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if not is_authenticated(self.headers) and not is_dashboard_request(self.headers):
            self.send_json(401, {"error": "Authentication required"})
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length <= 0 or content_length > 10 * 1024 * 1024:
            self.send_json(413, {"error": "Upload must be between 1 byte and 10 MB"})
            return

        content_type = self.headers.get("Content-Type", "")
        boundary_match = re.search(r'boundary="?([^";]+)', content_type)
        if not boundary_match:
            self.send_json(400, {"error": "Missing multipart boundary"})
            return

        boundary = ("--" + boundary_match.group(1)).encode("utf-8")
        body = self.rfile.read(content_length)
        combined = {
            "batches": [],
            "batchClients": [],
            "alerts": [],
            "impact": [],
            "monthly": [],
            "sourceFiles": [],
        }

        try:
            for part in body.split(boundary):
                if b"filename=" not in part:
                    continue
                header, _, payload = part.partition(b"\r\n\r\n")
                if not payload:
                    continue
                filename_match = re.search(rb'filename="([^"]+)"', header)
                filename = unquote(filename_match.group(1).decode("utf-8", "ignore")) if filename_match else "upload.xlsx"
                filename = Path(filename).name
                if payload.endswith(b"\r\n"):
                    payload = payload[:-2]
                if Path(filename).suffix.lower() not in {".xlsx", ".xls"}:
                    continue
                parsed = parse_workbook(payload, filename)
                for key in combined:
                    combined[key].extend(parsed[key])
        except Exception as error:
            self.send_json(400, {"error": f"Workbook could not be parsed: {error}"})
            return

        if not combined["sourceFiles"]:
            self.send_json(400, {"error": "No supported Excel workbook was found"})
            return
        self.send_json(200, combined)
