import json
from pathlib import Path

from server import parse_workbook

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "data" / "actual_data.json"

SOURCE_FILES = [
    Path(r"C:\Users\SERRA032\Downloads\File 10.xlsx"),
    Path(r"C:\Users\SERRA032\Documents\Consolidated RTM Alert Check.xlsx"),
]

BATCHES = [
    {
        "batch": "Batch 1",
        "liveWeek": "Week of March 16",
        "liveDate": "2026-03-16",
        "notes": "Provided in attached batch schedule image.",
    },
    {
        "batch": "Batch 2",
        "liveWeek": "Week of March 23",
        "liveDate": "2026-03-23",
        "notes": "Provided in attached batch schedule image.",
    },
    {
        "batch": "Batch 3",
        "liveWeek": "Week of April 13",
        "liveDate": "2026-04-13",
        "notes": "Provided in attached batch schedule image.",
    },
]

BATCH_CLIENTS = [
    {"batch": "Batch 1", "client": "Client 1", "tool": "TP Genesys", "liveWeek": "16-Mar"},
    {"batch": "Batch 1", "client": "Client 2", "tool": "TP Genesys", "liveWeek": "16-Mar"},
    {"batch": "Batch 1", "client": "Client 3", "tool": "TP Genesys", "liveWeek": "16-Mar"},
    {"batch": "Batch 1", "client": "Client 4", "tool": "TP Genesys", "liveWeek": "16-Mar"},
    {"batch": "Batch 2", "client": "Client 5", "tool": "TP Genesys", "liveWeek": "23-Mar"},
    {"batch": "Batch 2", "client": "Client 6", "tool": "TP Genesys", "liveWeek": "23-Mar"},
    {"batch": "Batch 2", "client": "Client 7", "tool": "TP Genesys", "liveWeek": "23-Mar"},
    {"batch": "Batch 2", "client": "Client 8", "tool": "TP Genesys", "liveWeek": "23-Mar"},
    {"batch": "Batch 3", "client": "Client 9", "tool": "TP Genesys", "liveWeek": "13-Apr"},
    {"batch": "Batch 3", "client": "Client 10", "tool": "TP Genesys", "liveWeek": "13-Apr"},
    {"batch": "Batch 3", "client": "Client 11", "tool": "TP Genesys", "liveWeek": "13-Apr"},
    {"batch": "Batch 3", "client": "Client 12", "tool": "TP Genesys", "liveWeek": "13-Apr"},
]


def main():
    combined = {"batches": BATCHES, "batchClients": BATCH_CLIENTS, "alerts": [], "impact": [], "monthly": [], "sourceFiles": []}
    for path in SOURCE_FILES:
        parsed = parse_workbook(path.read_bytes(), path.name)
        combined["alerts"].extend(parsed["alerts"])
        combined["impact"].extend(parsed["impact"])
        combined["monthly"].extend(parsed["monthly"])
        combined["sourceFiles"].extend(parsed["sourceFiles"])

    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_text(json.dumps(combined, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "output": str(OUTPUT),
                "batches": len(combined["batches"]),
                "batchClients": len(combined["batchClients"]),
                "alerts": len(combined["alerts"]),
                "impact": len(combined["impact"]),
                "monthly": len(combined["monthly"]),
                "sourceFiles": combined["sourceFiles"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
