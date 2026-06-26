from __future__ import annotations

import json
import io
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

import pandas as pd

ROOT = Path(__file__).resolve().parent


def norm(value) -> str:
    if value is None:
        return ""
    if pd.isna(value):
        return ""
    return str(value).strip()


def key(value) -> str:
    return re.sub(r"[^a-z0-9]+", "", norm(value).lower())


def excel_date(value) -> str:
    if value is None or norm(value) == "":
        return ""
    if isinstance(value, pd.Timestamp):
        return value.strftime("%Y-%m-%d")
    try:
        parsed = pd.to_datetime(value)
        if not pd.isna(parsed):
            return parsed.strftime("%Y-%m-%d")
    except Exception:
        pass
    return norm(value)


def safe_float(value) -> float:
    text = norm(value).replace(",", "")
    if text in {"", "-", "N/A", "n/a"}:
        return 0.0
    try:
        return float(text)
    except Exception:
        return 0.0


def find_header(rows, required="client") -> int:
    wanted = key(required)
    for idx, row in enumerate(rows):
        if any(key(cell) == wanted for cell in row):
            return idx
    return -1


def objects_from_sheet(xls: pd.ExcelFile, sheet_name: str, required="client") -> list[dict]:
    raw = pd.read_excel(xls, sheet_name=sheet_name, header=None, dtype=object)
    rows = raw.fillna("").values.tolist()
    header_idx = find_header(rows, required)
    if header_idx < 0:
        return []
    headers = [norm(cell) or f"Column {i + 1}" for i, cell in enumerate(rows[header_idx])]
    out = []
    for row in rows[header_idx + 1 :]:
        if not any(norm(cell) for cell in row):
            continue
        out.append({headers[i]: row[i] if i < len(row) else "" for i in range(len(headers))})
    return out


def read_field(row: dict, names: list[str]):
    lookup = {key(k): v for k, v in row.items()}
    for name in names:
        value = lookup.get(key(name), "")
        if norm(value):
            return value
    return ""


def parse_alerts(rows: list[dict]) -> list[dict]:
    parsed = []
    check_re = re.compile(r"^[ABCD]\d|enabled|queue|account|teams|arriving|columns|duplicates|threshold|frequency|hoop|agent|status|duration|stale", re.I)
    for row in rows:
        checks = {h: norm(v).upper() for h, v in row.items() if check_re.search(norm(h))}
        fail_count = sum(1 for v in checks.values() if v == "FAIL")
        status = norm(read_field(row, ["Overall Status", "Status"])).upper() or ("FAIL" if fail_count else "PASS")
        item = {
            "client": norm(read_field(row, ["Client"])),
            "auditDate": excel_date(read_field(row, ["Audit Date", "Date"])),
            "category": norm(read_field(row, ["Category"])),
            "alertName": norm(read_field(row, ["Alert Name", "Alert"])),
            "expectedThreshold": norm(read_field(row, ["Expected Threshold"])),
            "unit": norm(read_field(row, ["Unit"])),
            "expectedFreq": norm(read_field(row, ["Expected Freq", "Expected Frequency"])),
            "overallStatus": status if status in {"PASS", "FAIL"} else "Needs Review",
            "notes": norm(read_field(row, ["Notes / Findings", "Notes", "Findings", "Remarks"])),
            "checks": checks,
        }
        if item["client"]:
            parsed.append(item)
    return parsed


def parse_batches(rows: list[dict]) -> list[dict]:
    out = []
    for row in rows:
        item = {
            "batch": norm(read_field(row, ["Batch"])),
            "liveWeek": norm(read_field(row, ["Live Week"])),
            "liveDate": excel_date(read_field(row, ["Live Week Start Date", "Live Date", "Start Date"])),
            "notes": norm(read_field(row, ["Notes"])),
        }
        if item["batch"]:
            out.append(item)
    return out


def parse_batch_clients(rows: list[dict]) -> list[dict]:
    out = []
    for row in rows:
        item = {
            "batch": norm(read_field(row, ["Batch"])),
            "client": norm(read_field(row, ["Client"])),
            "tool": norm(read_field(row, ["Tool"])),
            "liveWeek": norm(read_field(row, ["Live Week"])),
        }
        if item["batch"] and item["client"]:
            out.append(item)
    return out


def parse_impact(rows: list[dict]) -> list[dict]:
    out = []
    for row in rows:
        item = {
            "client": norm(read_field(row, ["Client"])),
            "task": norm(read_field(row, ["RTA Task Category", "Area", "Task"])),
            "covered": norm(read_field(row, ["Covered by RTM Bot?", "Covered", "Bot Coverage"])),
            "before": norm(read_field(row, ["Before Bot", "Pre-RTM Bot"])),
            "after": norm(read_field(row, ["After Bot", "Post-RTM Bot"])),
            "efficiency": norm(read_field(row, ["Efficiency Created"])),
            "hcImpact": norm(read_field(row, ["HC Impact"])),
            "remarks": norm(read_field(row, ["Remarks"])),
        }
        if item["client"]:
            out.append(item)
    return out


def parse_monthly(rows: list[dict]) -> list[dict]:
    out = []
    for row in rows:
        item = {
            "client": norm(read_field(row, ["Client"])),
            "month": norm(read_field(row, ["Month", "Months"])),
            "sl": safe_float(read_field(row, ["SL"])),
            "aht": safe_float(read_field(row, ["AHT"])),
            "volumeHandled": safe_float(read_field(row, ["Volume Handled", "Volumn (Handled vs Forecast)", "Handled Volume"])),
            "forecastVolume": safe_float(read_field(row, ["Forecast Volume"])),
            "drivers": norm(read_field(row, ["Drivers", "What are the drivers affecting the New Hire and Tenure AHT?"])),
        }
        if item["client"]:
            out.append(item)
    return out


def parse_workbook(payload: bytes, file_name: str) -> dict:
    result = {"batches": [], "batchClients": [], "alerts": [], "impact": [], "monthly": [], "sourceFiles": [file_name]}
    xls = pd.ExcelFile(io.BytesIO(payload))
    for sheet in xls.sheet_names:
        rows = objects_from_sheet(xls, sheet)
        if not rows:
            batch_rows = objects_from_sheet(xls, sheet, required="batch")
            if batch_rows:
                result["batches"].extend(parse_batches(batch_rows))
            continue
        headers = "|".join(key(h) for h in rows[0].keys())
        lower = sheet.lower()
        if ("batchclient" in lower or "batch client" in lower or ("batch" in headers and "client" in headers and "tool" in headers and "liveweek" in headers)):
            result["batchClients"].extend(parse_batch_clients(rows))
        elif "batch" in lower or "liveweek" in headers:
            result["batches"].extend(parse_batches(rows))
        elif "alert" in lower or "alertname" in headers or "overallstatus" in headers:
            result["alerts"].extend(parse_alerts(rows))
        elif "impact" in lower or "table" in lower or "beforebot" in headers or "coveredbyrtmbot" in headers:
            result["impact"].extend(parse_impact(rows))
        elif "monthly" in lower or "kpi" in lower or "adds" in lower or "aht" in headers:
            result["monthly"].extend(parse_monthly(rows))
    return result


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/data":
            data_path = ROOT / "data" / "actual_data.json"
            if not data_path.exists():
                self.send_error(404, "Actual data has not been generated")
                return
            data = data_path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        super().do_GET()

    def do_POST(self):
        if self.path != "/upload":
            self.send_error(404)
            return
        content_type = self.headers.get("Content-Type", "")
        boundary_match = re.search(r"boundary=(.+)", content_type)
        if not boundary_match:
            self.send_error(400, "Missing multipart boundary")
            return
        boundary = ("--" + boundary_match.group(1)).encode()
        body = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        combined = {"batches": [], "batchClients": [], "alerts": [], "impact": [], "monthly": [], "sourceFiles": []}
        for part in body.split(boundary):
            if b"filename=" not in part:
                continue
            header, _, payload = part.partition(b"\r\n\r\n")
            if not payload:
                continue
            filename_match = re.search(rb'filename="([^"]+)"', header)
            filename = unquote(filename_match.group(1).decode("utf-8", "ignore")) if filename_match else "upload.xlsx"
            filename = Path(filename).name
            payload = payload.rstrip(b"\r\n-")
            if Path(filename).suffix.lower() not in {".xlsx", ".xls"}:
                continue
            parsed = parse_workbook(payload, filename)
            for k in ["batches", "batchClients", "alerts", "impact", "monthly", "sourceFiles"]:
                combined[k].extend(parsed[k])
        data = json.dumps(combined).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    port = 8027
    print(f"Serving VCO - RTM Bot dashboard at http://127.0.0.1:{port}/index.html")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
