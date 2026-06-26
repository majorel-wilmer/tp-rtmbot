import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "outputs";
await fs.mkdir(outputDir, { recursive: true });

const wb = Workbook.create();
const cover = wb.worksheets.add("Start Here");
const batch = wb.worksheets.add("Batch Schedule");
const batchClients = wb.worksheets.add("Batch Client Mapping");
const alerts = wb.worksheets.add("Alert Health Check");
const impact = wb.worksheets.add("Bot Impact");
const monthly = wb.worksheets.add("Monthly KPI");
const lookups = wb.worksheets.add("Lookup Lists");

const colors = {
  navy: "#16324F",
  teal: "#0F766E",
  blue: "#2563EB",
  amber: "#F59E0B",
  red: "#DC2626",
  green: "#16A34A",
  gray: "#F3F4F6",
  line: "#D1D5DB",
  ink: "#111827",
  muted: "#6B7280",
};

function styleTitle(sheet, range, title, subtitle = "") {
  const r = sheet.getRange(range);
  r.merge();
  r.values = [[title]];
  r.format = {
    fill: colors.navy,
    font: { bold: true, color: "#FFFFFF", size: 16 },
    wrapText: true,
    horizontalAlignment: "left",
    verticalAlignment: "middle",
  };
  r.format.rowHeightPx = 40;
  if (subtitle) {
    const sub = sheet.getRange("A2:H2");
    sub.merge();
    sub.values = [[subtitle]];
    sub.format = {
      fill: "#E0F2FE",
      font: { color: colors.ink, italic: true },
      wrapText: true,
    };
  }
}

function styleHeader(range) {
  range.format = {
    fill: colors.teal,
    font: { bold: true, color: "#FFFFFF" },
    wrapText: true,
    verticalAlignment: "middle",
    horizontalAlignment: "center",
    borders: { preset: "all", style: "thin", color: colors.line },
  };
}

function styleTable(sheet, address, tableName) {
  const range = sheet.getRange(address);
  range.format.borders = { preset: "all", style: "thin", color: colors.line };
  const table = sheet.tables.add(address, true, tableName);
  table.style = "TableStyleMedium2";
  table.showFilterButton = true;
  return table;
}

for (const ws of [cover, batch, batchClients, alerts, impact, monthly, lookups]) {
  ws.showGridLines = false;
}

styleTitle(
  cover,
  "A1:H1",
  "VCO - RTM Bot Upload Template",
  "Use this file as the standard upload format for the local VCO - RTM Bot dashboard."
);
cover.getRange("A4:B10").values = [
  ["Sheet", "Purpose"],
  ["Batch Schedule", "Maps rollout batches to live weeks. Matches the Batch 1 / Week of March 16 layout."],
  ["Batch Client Mapping", "Maps each batch to client, tool, and live week. This powers the Batch Client Mapping panel."],
  ["Alert Health Check", "One row per client, audit date, category, and alert. PASS/FAIL checks drive dashboard quality scores."],
  ["Bot Impact", "Before/after operating impact by client and RTM task category."],
  ["Monthly KPI", "Monthly SL, AHT, volume, and qualitative analysis by client."],
  ["Lookup Lists", "Dropdown values used by editable sheets."],
  ["Upload rule", "Keep the headers unchanged. Add new rows below the sample rows, then upload this workbook in the dashboard."],
];
styleHeader(cover.getRange("A4:B4"));
cover.getRange("A4:B11").format.borders = { preset: "all", style: "thin", color: colors.line };
cover.getRange("A:A").format.columnWidth = 22;
cover.getRange("B:B").format.columnWidth = 94;
cover.getRange("B5:B10").format.wrapText = true;

styleTitle(batch, "A1:D1", "Batch Schedule");
batch.getRange("A3:D6").values = [
  ["Batch", "Live Week", "Live Week Start Date", "Notes"],
  ["Batch 1", "Week of March 16", new Date(2026, 2, 16), ""],
  ["Batch 2", "Week of March 23", new Date(2026, 2, 23), ""],
  ["Batch 3", "Week of April 13", new Date(2026, 3, 13), ""],
];
styleHeader(batch.getRange("A3:D3"));
styleTable(batch, "A3:D30", "BatchSchedule");
batch.getRange("C4:C30").format.numberFormat = "yyyy-mm-dd";
batch.getRange("A:D").format.columnWidth = 24;
batch.freezePanes.freezeRows(3);

styleTitle(batchClients, "A1:D1", "Batch Client Mapping");
batchClients.getRange("A3:D15").values = [
  ["Batch", "Client", "Tool", "Live Week"],
  ["Batch 1", "Client 1", "TP Genesys", "16-Mar"],
  ["Batch 1", "Client 2", "TP Genesys", "16-Mar"],
  ["Batch 1", "Client 3", "TP Genesys", "16-Mar"],
  ["Batch 1", "Client 4", "TP Genesys", "16-Mar"],
  ["Batch 2", "Client 5", "TP Genesys", "23-Mar"],
  ["Batch 2", "Client 6", "TP Genesys", "23-Mar"],
  ["Batch 2", "Client 7", "TP Genesys", "23-Mar"],
  ["Batch 2", "Client 8", "TP Genesys", "23-Mar"],
  ["Batch 3", "Client 9", "TP Genesys", "13-Apr"],
  ["Batch 3", "Client 10", "TP Genesys", "13-Apr"],
  ["Batch 3", "Client 11", "TP Genesys", "13-Apr"],
  ["Batch 3", "Client 12", "TP Genesys", "13-Apr"],
];
styleHeader(batchClients.getRange("A3:D3"));
styleTable(batchClients, "A3:D120", "BatchClientMapping");
batchClients.getRange("A:D").format.columnWidth = 24;
batchClients.freezePanes.freezeRows(3);

const alertHeaders = [
  "Client",
  "Audit Date",
  "Category",
  "Alert Name",
  "Expected Threshold",
  "Unit",
  "Expected Freq",
  "A1 Alert Enabled?",
  "A2 All Configuration Queue Group?",
  "A3 Correct Account?",
  "B1 Teams ID Valid?",
  "B2 Alert Arriving?",
  "B3 Data Columns OK?",
  "B4 No Duplicates?",
  "C1 Threshold Correct?",
  "C2 Frequency Correct?",
  "C3 HOOP Window OK?",
  "D1 Agent Names Match?",
  "D2 Status Matches Genesys?",
  "D3 Duration Accurate?",
  "D4 Correct Queue Data?",
  "D5 No Stale Data?",
  "Overall Status",
  "Notes / Findings",
];
styleTitle(alerts, "A1:X1", "RTM Alert Health Check");
alerts.getRange("A3:X6").values = [
  alertHeaders,
  ["Abbott", new Date(2026, 4, 18), "Aux", "Break", 15, "Minutes", 60, "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "FAIL", "PASS", "PASS", "PASS", "Some agents matched bot but duration differed."],
  ["Epson", new Date(2026, 4, 18), "SLA", "SLA Risk", 80, "%", 30, "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", ""],
  ["Temu", new Date(2026, 4, 18), "ASA", "ASA Risk", 30, "Seconds", 30, "PASS", "FAIL", "PASS", "PASS", "FAIL", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "PASS", "FAIL", "Queue group and delivery validation needed."],
];
styleHeader(alerts.getRange("A3:X3"));
styleTable(alerts, "A3:X250", "AlertHealthCheck");
alerts.getRange("B4:B250").format.numberFormat = "yyyy-mm-dd";
alerts.getRange("E4:E250").format.numberFormat = "0.0";
alerts.getRange("A:X").format.columnWidth = 18;
alerts.getRange("X:X").format.columnWidth = 44;
alerts.getRange("X4:X250").format.wrapText = true;
alerts.freezePanes.freezeRows(3);
alerts.freezePanes.freezeColumns(1);

const passFailRange = "Lookup Lists!$A$2:$A$5";
for (const col of ["H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W"]) {
  alerts.getRange(`${col}4:${col}250`).dataValidation = { rule: { type: "list", formula1: passFailRange } };
}
alerts.getRange("W4:W250").dataValidation = { rule: { type: "list", formula1: passFailRange } };

styleTitle(impact, "A1:H1", "RTM Bot Impact");
impact.getRange("A3:H7").values = [
  ["Client", "RTA Task Category", "Covered by RTM Bot?", "Before Bot", "After Bot", "Efficiency Created", "HC Impact", "Remarks"],
  ["Epson", "Real-time queue monitoring", "Yes - Partial", "High manual effort", "High manual effort", "No clear time saving", "Partial", "Still needs RTA validation; delay in bot callouts; skilling mismatch."],
  ["Epson", "SLA / ASA / abandon risk detection", "Yes", "Manual interval review", "Automated alerting", "Faster callout", "No HC reduction", "Still needs RTA validation."],
  ["Abbott", "Teams delivery validation", "Yes", "Manual checks", "Bot-supported checks", "30 min/day saved", "Partial", ""],
  ["Temu", "Duplicate alert review", "No", "Manual checks", "Manual checks", "No change", "No HC reduction", "Bot coverage pending."],
];
styleHeader(impact.getRange("A3:H3"));
styleTable(impact, "A3:H200", "BotImpact");
impact.getRange("A:H").format.columnWidth = 22;
impact.getRange("H:H").format.columnWidth = 48;
impact.getRange("B:H").format.wrapText = true;
impact.getRange("C4:C200").dataValidation = { rule: { type: "list", formula1: "Lookup Lists!$B$2:$B$5" } };
impact.freezePanes.freezeRows(3);

styleTitle(monthly, "A1:L1", "Monthly KPI and Bot Analysis");
monthly.getRange("A3:L7").values = [
  ["Client", "Month", "SL", "AHT", "Volume Handled", "Forecast Volume", "Bot Helps Increase SL?", "Bot Impact on AHT Target?", "New Hire Impact?", "Drivers", "Action Steps", "POC"],
  ["Epson", "March", 0.8231, 11.61, 12500, 12100, "No; high availability already experienced most of the time", "Partial; WFM/Ops call out long interactions before bot notifications", "No", "Driver installation, warranty claim, print quality", "OPS support; sup line escalation; callback requests", "Leonardo Jr Dolorito"],
  ["Epson", "April", 0.8420, 10.95, 12800, 12600, "Partial", "Partial", "No", "Print quality and install calls", "Review threshold timing and callout ownership", ""],
  ["Abbott", "March", 0.9000, 8.25, 8400, 8500, "Yes", "Yes", "No", "Stable staffing", "Monitor alert delivery", ""],
  ["Temu", "March", 0.7800, 13.20, 15100, 14700, "Partial", "No", "Yes", "New-hire handling time", "Segment new-hire vs tenured AHT and validate thresholds", ""],
];
styleHeader(monthly.getRange("A3:L3"));
styleTable(monthly, "A3:L200", "MonthlyKPI");
monthly.getRange("C4:C200").format.numberFormat = "0.0%";
monthly.getRange("D4:D200").format.numberFormat = "0.00";
monthly.getRange("E4:F200").format.numberFormat = "#,##0";
monthly.getRange("A:L").format.columnWidth = 20;
monthly.getRange("G:K").format.columnWidth = 38;
monthly.getRange("G:K").format.wrapText = true;
monthly.freezePanes.freezeRows(3);

lookups.getRange("A1:D1").values = [["Pass Fail Values", "Bot Coverage Values", "Status", "Priority"]];
lookups.getRange("A2:A5").values = [["PASS"], ["FAIL"], ["N/A"], ["Not Checked"]];
lookups.getRange("B2:B5").values = [["Yes"], ["Yes - Partial"], ["No"], ["Unknown"]];
lookups.getRange("C2:C5").values = [["Ready"], ["Needs Validation"], ["Requires Intervention"], ["Blocked"]];
lookups.getRange("D2:D5").values = [["High"], ["Medium"], ["Low"], ["Monitor"]];
styleHeader(lookups.getRange("A1:D1"));
lookups.getRange("A:D").format.columnWidth = 24;

for (const ws of [batch, batchClients, alerts, impact, monthly, cover]) {
  ws.getUsedRange().format.font = { name: "Aptos", color: colors.ink };
}

const inspect = await wb.inspect({
  kind: "sheet,table",
  maxChars: 5000,
  tableMaxRows: 4,
  tableMaxCols: 8,
});
console.log(inspect.ndjson);

const errors = await wb.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log(errors.ndjson);

for (const sheetName of ["Start Here", "Batch Schedule", "Batch Client Mapping", "Alert Health Check", "Bot Impact", "Monthly KPI"]) {
  const preview = await wb.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(`${outputDir}/${sheetName.replaceAll(" ", "_")}.png`, new Uint8Array(await preview.arrayBuffer()));
}

const out = await SpreadsheetFile.exportXlsx(wb);
await out.save(`${outputDir}/VCO_RTM_Bot_Upload_Template.xlsx`);
console.log("saved outputs/VCO_RTM_Bot_Upload_Template.xlsx");
