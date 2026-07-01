const DATA_SCHEMA_VERSION = 2;
const PRODUCTION_ORIGIN = "https://tp-rtmbot.vercel.app";

const sampleData = {
  batches: [
    { batch: "Batch 1", liveWeek: "Week of March 16", liveDate: "2026-03-16", notes: "" },
    { batch: "Batch 2", liveWeek: "Week of March 23", liveDate: "2026-03-23", notes: "" },
    { batch: "Batch 3", liveWeek: "Week of April 13", liveDate: "2026-04-13", notes: "" },
  ],
  batchClients: [
    { batch: "Batch 1", client: "Client 1", tool: "TP Genesys", liveWeek: "16-Mar" },
    { batch: "Batch 1", client: "Client 2", tool: "TP Genesys", liveWeek: "16-Mar" },
    { batch: "Batch 1", client: "Client 3", tool: "TP Genesys", liveWeek: "16-Mar" },
    { batch: "Batch 1", client: "Client 4", tool: "TP Genesys", liveWeek: "16-Mar" },
    { batch: "Batch 2", client: "Client 5", tool: "TP Genesys", liveWeek: "23-Mar" },
    { batch: "Batch 2", client: "Client 6", tool: "TP Genesys", liveWeek: "23-Mar" },
    { batch: "Batch 2", client: "Client 7", tool: "TP Genesys", liveWeek: "23-Mar" },
    { batch: "Batch 2", client: "Client 8", tool: "TP Genesys", liveWeek: "23-Mar" },
    { batch: "Batch 3", client: "Client 9", tool: "TP Genesys", liveWeek: "13-Apr" },
    { batch: "Batch 3", client: "Client 10", tool: "TP Genesys", liveWeek: "13-Apr" },
    { batch: "Batch 3", client: "Client 11", tool: "TP Genesys", liveWeek: "13-Apr" },
    { batch: "Batch 3", client: "Client 12", tool: "TP Genesys", liveWeek: "13-Apr" },
  ],
  alerts: [
    { client: "Abbott", auditDate: "2026-05-18", category: "Aux", alertName: "Break", expectedThreshold: 15, unit: "Minutes", expectedFreq: 60, overallStatus: "PASS", notes: "Some agents matched bot but duration differed.", checks: { duration: "FAIL" } },
    { client: "Epson", auditDate: "2026-05-18", category: "SLA", alertName: "SLA Risk", expectedThreshold: 80, unit: "%", expectedFreq: 30, overallStatus: "PASS", notes: "", checks: {} },
    { client: "Temu", auditDate: "2026-05-18", category: "ASA", alertName: "ASA Risk", expectedThreshold: 30, unit: "Seconds", expectedFreq: 30, overallStatus: "FAIL", notes: "Queue group and delivery validation needed.", checks: { config: "FAIL", arriving: "FAIL" } },
  ],
  impact: [
    { client: "Epson", task: "Real-time queue monitoring", covered: "Yes - Partial", before: "High manual effort", after: "High manual effort", efficiency: "No clear time saving", hcImpact: "Partial", remarks: "Still needs RTA validation." },
    { client: "Abbott", task: "Teams delivery validation", covered: "Yes", before: "Manual checks", after: "Bot-supported checks", efficiency: "30 min/day saved", hcImpact: "Partial", remarks: "" },
    { client: "Temu", task: "Duplicate alert review", covered: "No", before: "Manual checks", after: "Manual checks", efficiency: "No change", hcImpact: "No HC reduction", remarks: "Bot coverage pending." },
  ],
  monthly: [
    { client: "Epson", month: "March", sl: 0.8231, aht: 11.61, volumeHandled: 12500, forecastVolume: 12100, drivers: "Driver installation, warranty claim, print quality" },
    { client: "Abbott", month: "March", sl: 0.9, aht: 8.25, volumeHandled: 8400, forecastVolume: 8500, drivers: "Stable staffing" },
    { client: "Temu", month: "March", sl: 0.78, aht: 13.2, volumeHandled: 15100, forecastVolume: 14700, drivers: "New-hire handling time" },
  ],
  sourceFiles: ["Starter sample"],
};

let state = structuredClone(sampleData);

const emptyData = () => ({
  batches: [],
  batchClients: [],
  alerts: [],
  impact: [],
  monthly: [],
  sourceFiles: [],
});

const $ = (id) => document.getElementById(id);
const norm = (value) => String(value ?? "").trim();
const percent = (value) => `${Math.round((value || 0) * 100)}%`;
const getValue = (id) => $(id)?.value || "";
const setText = (id, value) => {
  if ($(id)) $(id).textContent = value;
};
const cssVar = (name) => getComputedStyle(document.body).getPropertyValue(name).trim();

function applyTheme(theme, shouldRender = false) {
  document.body.dataset.theme = theme;
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    const icon = theme === "dark" ? "sun" : "moon";
    button.innerHTML = `<i data-lucide="${icon}"></i><span>${theme === "dark" ? "Light mode" : "Dark mode"}</span>`;
    button.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
  });
  window.lucide?.createIcons();
  if (shouldRender) render();
}

applyTheme(localStorage.getItem("vcoRtmTheme") === "light" ? "light" : "dark");

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("vcoRtmDashboardData"));
    return saved?._schemaVersion === DATA_SCHEMA_VERSION ? saved : structuredClone(sampleData);
  } catch {
    return structuredClone(sampleData);
  }
}

async function loadInitialData() {
  if (localStorage.getItem("vcoRtmDashboardCleared") === "true") {
    state = emptyData();
    saveState();
    setText("uploadStatus", "All data is cleared. Upload a new workbook to begin.");
    populateFilters();
    render();
    return;
  }
  const savedUpload = loadState();
  if (savedUpload?._schemaVersion === DATA_SCHEMA_VERSION) {
    state = savedUpload;
    setText("uploadStatus", `Loaded saved upload: ${(state.sourceFiles || []).join(", ")}`);
    populateFilters();
    render();
    return;
  }
  if (window.VCO_RTM_ACTUAL_DATA) {
    state = { ...window.VCO_RTM_ACTUAL_DATA, _schemaVersion: DATA_SCHEMA_VERSION };
    localStorage.setItem("vcoRtmDashboardSeed", JSON.stringify(state));
    setText("uploadStatus", `Loaded actual data: ${(state.sourceFiles || []).join(", ")}`);
    populateFilters();
    render();
    return;
  }
  try {
    const response = await fetch("/api/data", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state = { ...(await response.json()), _schemaVersion: DATA_SCHEMA_VERSION };
    localStorage.setItem("vcoRtmDashboardSeed", JSON.stringify(state));
    setText("uploadStatus", `Loaded actual data: ${(state.sourceFiles || []).join(", ")}`);
  } catch {
    try {
      state = JSON.parse(localStorage.getItem("vcoRtmDashboardSeed")) || loadState();
      setText("uploadStatus", "Using last loaded local data.");
    } catch {
      state = loadState();
      setText("uploadStatus", "Using starter sample data.");
    }
  }
  populateFilters();
  render();
}

function saveState() {
  localStorage.setItem("vcoRtmDashboardData", JSON.stringify(state));
}

async function handleFiles(files) {
  if (!files.length) return;
  setText("uploadStatus", "Reading uploaded workbook(s)...");
  const form = new FormData();
  files.forEach((file) => form.append("files", file, file.name));
  let next;
  try {
    const response = await fetch("/api/upload", { method: "POST", body: form, credentials: "same-origin" });
    if (response.status === 401) {
      setText("uploadStatus", "Your session expired. Redirecting to the production login...");
      window.location.href = `${window.location.origin}/login.html`;
      return;
    }
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.error || `HTTP ${response.status}`);
    }
    next = await response.json();
  } catch (error) {
    setText("uploadStatus", `Upload failed: ${error.message}`);
    return;
  }
  state = {
    _schemaVersion: DATA_SCHEMA_VERSION,
    batches: next.batches.length ? next.batches : state.batches,
    batchClients: next.batchClients?.length ? next.batchClients : state.batchClients,
    alerts: next.alerts.length ? next.alerts : state.alerts,
    impact: next.impact.length ? next.impact : state.impact,
    monthly: next.monthly.length ? next.monthly : state.monthly,
    sourceFiles: next.sourceFiles,
  };
  localStorage.removeItem("vcoRtmDashboardCleared");
  saveState();
  setText("uploadStatus", `Loaded ${next.sourceFiles.length} file(s): ${next.sourceFiles.join(", ")}`);
  populateFilters();
  render();
}

function selectedRows() {
  const client = getValue("clientFilter");
  const status = getValue("statusFilter");
  return state.alerts.filter((row) => (!client || row.client === client) && (!status || row.overallStatus === status));
}

function visibleImpact() {
  const client = getValue("clientFilter");
  return state.impact.filter((row) => !client || row.client === client);
}

function countBy(rows, selector) {
  return rows.reduce((acc, row) => {
    const k = selector(row) || "Unmapped";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

function canvasSetup(id) {
  const canvas = $(id);
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(320, rect.width) * ratio;
  canvas.height = 280 * ratio;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "12px Segoe UI, Arial";
  return { canvas, ctx, width: Math.max(320, rect.width), height: 280 };
}

function drawEmpty(ctx, width, height, message = "No data") {
  ctx.fillStyle = cssVar("--muted");
  ctx.textAlign = "center";
  ctx.fillText(message, width / 2, height / 2);
}

function drawBarChart(id, labels, values, color = cssVar("--violet"), horizontal = false, valueSuffix = "") {
  const { ctx, width, height } = canvasSetup(id);
  if (!labels.length) return drawEmpty(ctx, width, height);
  const max = Math.max(...values, 1);
  const left = 44;
  const top = 18;
  const chartW = horizontal ? width - left - 70 : width - 70;
  const chartH = height - 64;
  ctx.strokeStyle = cssVar("--canvas-grid");
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, top + chartH);
  ctx.lineTo(left + chartW, top + chartH);
  ctx.stroke();
  labels.forEach((label, i) => {
    const slot = chartH / labels.length;
    const bar = Math.max(2, (values[i] / max) * (horizontal ? chartW : chartH));
    ctx.fillStyle = color;
    if (horizontal) {
      ctx.fillRect(left, top + i * slot + 8, bar, Math.max(12, slot - 14));
      ctx.fillStyle = cssVar("--ink");
      ctx.textAlign = "left";
      ctx.fillText(String(label).slice(0, 18), left + 4, top + i * slot + 20);
      ctx.textAlign = "right";
      ctx.fillText(`${values[i]}${valueSuffix}`, width - 8, top + i * slot + 20);
    } else {
      const barW = chartW / labels.length - 12;
      const x = left + i * (chartW / labels.length) + 6;
      const y = top + chartH - bar;
      ctx.fillRect(x, y, Math.max(14, barW), bar);
      ctx.fillStyle = cssVar("--ink");
      ctx.textAlign = "center";
      ctx.fillText(`${values[i]}${valueSuffix}`, x + barW / 2, y - 4);
      ctx.save();
      ctx.translate(x + barW / 2, top + chartH + 14);
      ctx.rotate(-0.35);
      ctx.fillText(String(label).slice(0, 12), 0, 0);
      ctx.restore();
    }
  });
}

function drawLineChart(id, labels, values) {
  const { ctx, width, height } = canvasSetup(id);
  if (!labels.length) return drawEmpty(ctx, width, height);
  const left = 44;
  const top = 18;
  const chartW = width - 70;
  const chartH = height - 64;
  ctx.strokeStyle = cssVar("--canvas-grid");
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, top + chartH);
  ctx.lineTo(left + chartW, top + chartH);
  ctx.stroke();
  ctx.strokeStyle = cssVar("--accent");
  ctx.lineWidth = 3;
  ctx.beginPath();
  values.forEach((value, i) => {
    const x = left + (labels.length === 1 ? chartW / 2 : (i / (labels.length - 1)) * chartW);
    const y = top + chartH - (value / 100) * chartH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  values.forEach((value, i) => {
    const x = left + (labels.length === 1 ? chartW / 2 : (i / (labels.length - 1)) * chartW);
    const y = top + chartH - (value / 100) * chartH;
    ctx.fillStyle = cssVar("--accent");
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cssVar("--ink");
    ctx.textAlign = "center";
    ctx.fillText(`${value}%`, x, y - 9);
    ctx.fillText(String(labels[i]).slice(5), x, top + chartH + 18);
  });
}

function drawDoughnut(id, labels, values) {
  const { ctx, width, height } = canvasSetup(id);
  const total = values.reduce((a, b) => a + b, 0);
  if (!total) return drawEmpty(ctx, width, height);
  const colors = [cssVar("--green"), cssVar("--red"), cssVar("--amber"), cssVar("--violet")];
  let start = -Math.PI / 2;
  const cx = width / 2;
  const cy = 112;
  values.forEach((value, i) => {
    const angle = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.fillStyle = colors[i % colors.length];
    ctx.arc(cx, cy, 78, start, start + angle);
    ctx.closePath();
    ctx.fill();
    start += angle;
  });
  ctx.fillStyle = cssVar("--canvas-hole");
  ctx.beginPath();
  ctx.arc(cx, cy, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = cssVar("--ink");
  ctx.textAlign = "center";
  ctx.font = "700 22px Segoe UI, Arial";
  ctx.fillText(String(total), cx, cy + 7);
  ctx.font = "12px Segoe UI, Arial";
  labels.forEach((label, i) => {
    const x = 24 + (i % 2) * (width / 2);
    const y = 220 + Math.floor(i / 2) * 22;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x, y - 10, 10, 10);
    ctx.fillStyle = cssVar("--ink");
    ctx.textAlign = "left";
    ctx.fillText(`${label}: ${values[i]}`, x + 16, y);
  });
}

function populateFilters() {
  const clients = [...new Set([...state.alerts, ...state.impact, ...state.monthly].map((r) => r.client).filter(Boolean))].sort();
  const batches = [...new Set(state.batches.map((r) => r.batch).filter(Boolean))];
  if ($("clientFilter")) $("clientFilter").innerHTML = `<option value="">All clients</option>${clients.map((c) => `<option>${escapeHtml(c)}</option>`).join("")}`;
  if ($("batchFilter")) $("batchFilter").innerHTML = `<option value="">All batches</option>${batches.map((b) => `<option>${escapeHtml(b)}</option>`).join("")}`;
}

function renderKpis(rows) {
  if (!$("kpiGrid")) return;
  const clients = new Set(rows.map((r) => r.client)).size;
  const failRows = rows.filter((r) => r.overallStatus === "FAIL").length;
  const passRate = rows.length ? rows.filter((r) => r.overallStatus === "PASS").length / rows.length : 0;
  const covered = visibleImpact().filter((r) => /yes/i.test(r.covered)).length;
  const totalImpact = visibleImpact().length;
  const kpis = [
    ["Clients", clients, "Visible portfolio"],
    ["Alert pass rate", percent(passRate), `${failRows} fail row(s)`],
    ["Bot coverage", totalImpact ? percent(covered / totalImpact) : "0%", `${covered} of ${totalImpact} task rows`],
    ["Batch clients", state.batchClients?.length || 0, `${state.batches.length} live-week mappings`],
  ];
  $("kpiGrid").innerHTML = kpis.map(([label, value, note]) => `<article class="kpi"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join("");
}

function renderCharts(rows) {
  const statusCounts = countBy(rows, (r) => r.overallStatus);
  if ($("statusChart")) drawDoughnut("statusChart", Object.keys(statusCounts), Object.values(statusCounts));

  const categoryFails = countBy(rows.filter((r) => r.overallStatus !== "PASS"), (r) => r.category);
  if ($("categoryChart")) drawBarChart("categoryChart", Object.keys(categoryFails), Object.values(categoryFails), cssVar("--red"), true);

  const byDate = {};
  rows.forEach((r) => {
    const d = r.auditDate || "Unmapped";
    byDate[d] ||= { total: 0, pass: 0 };
    byDate[d].total += 1;
    if (r.overallStatus === "PASS") byDate[d].pass += 1;
  });
  const dates = Object.keys(byDate).sort();
  if ($("trendChart")) drawLineChart("trendChart", dates, dates.map((d) => Math.round((byDate[d].pass / byDate[d].total) * 100)));

  const coverage = countBy(visibleImpact(), (r) => /partial/i.test(r.covered) ? "Partial" : /yes/i.test(r.covered) ? "Covered" : /no/i.test(r.covered) ? "Not Covered" : "Unknown");
  if ($("coverageChart")) drawBarChart("coverageChart", Object.keys(coverage), Object.values(coverage), cssVar("--teal"));

  const clientStats = {};
  rows.forEach((row) => {
    const client = row.client || "Unmapped";
    clientStats[client] ||= { total: 0, pass: 0 };
    clientStats[client].total += 1;
    if (row.overallStatus === "PASS") clientStats[client].pass += 1;
  });
  const clientPassRates = Object.entries(clientStats)
    .map(([client, stats]) => [client, Math.round((stats.pass / stats.total) * 100)])
    .sort((a, b) => b[1] - a[1]);
  if ($("clientPassChart")) {
    drawBarChart("clientPassChart", clientPassRates.map(([client]) => client), clientPassRates.map(([, rate]) => rate), cssVar("--violet"), true, "%");
  }

  const clientVolumes = Object.entries(countBy(rows, (row) => row.client))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  if ($("clientVolumeChart")) {
    drawBarChart("clientVolumeChart", clientVolumes.map(([client]) => client), clientVolumes.map(([, total]) => total), cssVar("--accent"), true);
  }

  const failedChecks = {};
  rows.forEach((row) => {
    Object.entries(row.checks || {}).forEach(([check, result]) => {
      const checkLabel = check.replace(/\s+/g, " ").trim();
      if (result === "FAIL" && !/overall status|expected threshold/i.test(checkLabel)) {
        failedChecks[checkLabel] = (failedChecks[checkLabel] || 0) + 1;
      }
    });
  });
  const topFailedChecks = Object.entries(failedChecks)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  if ($("failedChecksChart")) {
    drawBarChart("failedChecksChart", topFailedChecks.map(([check]) => check), topFailedChecks.map(([, total]) => total), cssVar("--red"), true);
  }

  const coverageByClient = {};
  visibleImpact().forEach((row) => {
    const client = (row.client || "Unmapped").split(" - ")[0];
    coverageByClient[client] ||= { total: 0, covered: 0 };
    coverageByClient[client].total += 1;
    if (/yes|partial/i.test(row.covered)) coverageByClient[client].covered += 1;
  });
  const clientCoverageRates = Object.entries(coverageByClient)
    .map(([client, stats]) => [client, Math.round((stats.covered / stats.total) * 100)])
    .sort((a, b) => b[1] - a[1]);
  if ($("clientCoverageChart")) {
    drawBarChart("clientCoverageChart", clientCoverageRates.map(([client]) => client), clientCoverageRates.map(([, rate]) => rate), cssVar("--teal"), true, "%");
  }

  const monthlyRows = state.monthly.filter((r) => !getValue("clientFilter") || r.client === getValue("clientFilter"));
  if ($("monthlyChart")) drawBarChart("monthlyChart", monthlyRows.map((r) => `${r.client} ${r.month}`), monthlyRows.map((r) => Math.round(r.sl * 100)), cssVar("--teal"));
}

function renderTimeline() {
  if (!$("batchTimeline") || !$("batchClientRows")) return;
  const selectedBatch = getValue("batchFilter");
  const batches = state.batches.filter((b) => !selectedBatch || b.batch === selectedBatch);
  $("batchTimeline").innerHTML = batches.map((b) => `
    <article class="batch-card">
      <strong>${escapeHtml(b.batch)}</strong>
      <span>${escapeHtml(b.liveWeek || b.liveDate || "No live week")}</span>
      <span>${escapeHtml(b.liveDate || "")}</span>
    </article>
  `).join("") || `<div class="analysis-item warn"><strong>No batch schedule loaded</strong><span>Upload the template or add rows to the Batch Schedule sheet.</span></div>`;

  const batchClients = (state.batchClients || []).filter((row) => !selectedBatch || row.batch === selectedBatch);
  $("batchClientCount").textContent = `${batchClients.length} client row(s)`;
  $("batchClientRows").innerHTML = batchClients.map((row) => `
    <tr>
      <td>${escapeHtml(row.batch)}</td>
      <td>${escapeHtml(row.client)}</td>
      <td>${escapeHtml(row.tool)}</td>
      <td>${escapeHtml(row.liveWeek)}</td>
    </tr>
  `).join("") || `<tr><td colspan="4">No batch-client mapping loaded.</td></tr>`;
}

function renderAnalysis(rows) {
  if (!$("analysisList")) return;
  const failRows = rows.filter((r) => r.overallStatus === "FAIL");
  const passRate = rows.length ? rows.filter((r) => r.overallStatus === "PASS").length / rows.length : 0;
  const topCategory = Object.entries(countBy(failRows, (r) => r.category)).sort((a, b) => b[1] - a[1])[0];
  const uncovered = visibleImpact().filter((r) => /no/i.test(r.covered)).length;
  const items = [
    {
      tone: passRate >= 0.9 ? "good" : passRate >= 0.75 ? "warn" : "bad",
      title: `Alert health is ${percent(passRate)}`,
      text: `${rows.length} visible alert row(s), with ${failRows.length} fail row(s).`,
    },
    {
      tone: topCategory ? "bad" : "good",
      title: topCategory ? `${topCategory[0]} is the top issue category` : "No failed categories in the current view",
      text: topCategory ? `${topCategory[1]} fail/review row(s) need validation.` : "Current filters show clean alert checks.",
    },
    {
      tone: uncovered ? "warn" : "good",
      title: `${uncovered} uncovered bot task row(s)`,
      text: uncovered ? "Review Bot Impact rows marked No or Unknown for automation scope decisions." : "All visible bot impact rows are at least partially covered.",
    },
  ];
  $("analysisList").innerHTML = items.map((item) => `<div class="analysis-item ${item.tone}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.text)}</span></div>`).join("");
}

function renderTable(rows) {
  if (!$("alertRows")) return;
  $("rowCount").textContent = `${rows.length} row(s)`;
  $("alertRows").innerHTML = rows.map((r) => {
    const failChecks = Object.entries(r.checks || {}).filter(([, v]) => v === "FAIL").map(([k]) => k).join("; ");
    const klass = r.overallStatus === "PASS" ? "status-pass" : r.overallStatus === "FAIL" ? "status-fail" : "status-review";
    return `<tr>
      <td>${escapeHtml(r.client)}</td>
      <td>${escapeHtml(r.auditDate)}</td>
      <td>${escapeHtml(r.category)}</td>
      <td>${escapeHtml(r.alertName)}</td>
      <td><span class="status-pill ${klass}">${escapeHtml(r.overallStatus)}</span></td>
      <td>${escapeHtml(failChecks || "-")}</td>
      <td>${escapeHtml(r.notes || "")}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="7">No rows match the current filters.</td></tr>`;
}

function render() {
  const rows = selectedRows();
  setText("dataSubtitle", `Source: ${(state.sourceFiles || []).join(", ") || "No data loaded"}`);
  renderKpis(rows);
  renderCharts(rows);
  renderTimeline();
  renderAnalysis(rows);
  renderTable(rows);
}

function exportCsv() {
  const headers = ["Client", "Audit Date", "Category", "Alert", "Status", "Fail Checks", "Notes"];
  const lines = [headers, ...selectedRows().map((r) => [
    r.client,
    r.auditDate,
    r.category,
    r.alertName,
    r.overallStatus,
    Object.entries(r.checks || {}).filter(([, v]) => v === "FAIL").map(([k]) => k).join("; "),
    r.notes,
  ])].map((row) => row.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","));
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "vco-rtm-alert-export.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function assistantClients() {
  const names = [
    ...(state.alerts || []).map((row) => row.client),
    ...(state.impact || []).map((row) => row.client),
    ...(state.monthly || []).map((row) => row.client),
    ...(state.batchClients || []).map((row) => row.client),
  ].filter(Boolean);
  const canonical = new Map();
  names.forEach((name) => {
    const key = assistantText(name);
    if (!canonical.has(key)) canonical.set(key, norm(name));
  });
  return [...canonical.values()].sort((a, b) => b.length - a.length);
}

function assistantText(value) {
  return norm(value).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function assistantContainsPhrase(text, phrase) {
  return ` ${text} `.includes(` ${phrase} `);
}

function assistantEditDistance(left, right) {
  const a = assistantText(left);
  const b = assistantText(right);
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[b.length];
}

function assistantClientAliases() {
  return [
    ["aeo", "American Eagle Outfitter"], ["american eagle", "American Eagle Outfitter"], ["ameagle", "American Eagle Outfitter"],
    ["cds", "CDS Global"], ["ceb pac", "Cebu Pacific"], ["cebu pac", "Cebu Pacific"],
    ["electrify", "Electrify America"], ["epsom", "Epson"], ["keurig dr pepper", "Keurig"],
    ["pdi", "PDI Technologies"], ["pdi tech", "PDI Technologies"],
    ["philam", "Philam Life AIA"], ["aia", "Philam Life AIA"],
    ["philcare", "Philcare Pharma Inc."], ["usbank", "US Bank"], ["u s bank", "US Bank"],
    ["teemu", "Temu"], ["abot", "Abbott"],
  ];
}

function assistantNgrams(text, minimum, maximum) {
  const words = assistantText(text).split(" ").filter(Boolean);
  const grams = [];
  for (let size = minimum; size <= Math.min(maximum, words.length); size += 1) {
    for (let index = 0; index <= words.length - size; index += 1) grams.push(words.slice(index, index + size).join(" "));
  }
  return grams;
}

function resolveAssistantClient(question) {
  const query = assistantText(question);
  const clients = assistantClients();
  const exact = clients.find((client) => assistantContainsPhrase(query, assistantText(client)));
  if (exact) return { client: exact, correction: "", suggestion: "" };

  const alias = assistantClientAliases().find(([name, target]) => clients.some((client) => assistantText(client) === assistantText(target)) && assistantContainsPhrase(query, assistantText(name)));
  if (alias) {
    const client = clients.find((item) => assistantText(item) === assistantText(alias[1]));
    return { client, correction: `I mapped "${alias[0]}" to ${client}`, suggestion: "" };
  }

  let closest = null;
  const fuzzyStopWords = new Set(["a", "about", "account", "alerts", "and", "are", "audit", "biggest", "bot", "client", "coverage", "defect", "defects", "failure", "failures", "for", "gap", "gaps", "has", "health", "how", "is", "launch", "me", "most", "performance", "show", "status", "tell", "the", "what", "which", "with"]);
  clients.filter((client) => !/^client \d+$/i.test(client)).forEach((client) => {
    const target = assistantText(client);
    const wordCount = target.split(" ").length;
    const grams = assistantNgrams(query, Math.max(1, wordCount - 1), wordCount + 1);
    grams.forEach((candidate) => {
      if (candidate.length < 3 || candidate.split(" ").some((word) => fuzzyStopWords.has(word))) return;
      const ratio = assistantEditDistance(candidate, target) / Math.max(candidate.length, target.length, 1);
      if (!closest || ratio < closest.ratio) closest = { client, candidate, ratio };
    });
  });
  if (closest?.ratio <= 0.28) {
    return { client: closest.client, correction: `I corrected "${closest.candidate}" to ${closest.client}`, suggestion: "" };
  }
  const clientCue = /\b(client|account|program|campaign|for|about)\b/.test(query);
  if (clientCue && closest?.ratio <= 0.42) {
    return { client: "", correction: "", suggestion: `I could not find "${closest.candidate}". Did you mean ${closest.client}?` };
  }
  const numberedClient = query.match(/\bclient\s+\d+\b/)?.[0] || "";
  if (numberedClient) {
    return { client: "", correction: "", suggestion: `I could not match "${numberedClient}". The current rollout uses actual client names instead of numbered placeholders.` };
  }
  const namedPhrase = query.match(/\b(?:client|account|program|campaign)\s+([a-z0-9 ]+)/)?.[1] || query.match(/\b(?:for|about)\s+([a-z0-9 ]+)/)?.[1] || "";
  const stopWords = new Set(["alert", "alerts", "audit", "audits", "biggest", "defect", "defects", "gap", "gaps", "has", "performance", "health", "failure", "failures", "issue", "issues", "coverage", "rollout", "launch", "monthly", "kpi", "summary", "status", "volume", "aht", "sl"]);
  const unknownName = namedPhrase.split(" ").filter(Boolean).filter((word, index, words) => index < (words.findIndex((item) => stopWords.has(item)) < 0 ? words.length : words.findIndex((item) => stopWords.has(item)))).join(" ");
  if (clientCue && unknownName.length >= 3) {
    return { client: "", correction: "", suggestion: `I could not match "${unknownName}" to an uploaded client. Check the spelling or choose from the available client list.` };
  }
  return { client: getValue("clientFilter") || "", correction: "", suggestion: "" };
}

function matchesAssistantClient(value, client) {
  if (!client) return true;
  const rowClient = assistantText(value);
  const target = assistantText(client);
  return rowClient === target || rowClient.startsWith(`${target} `) || target.startsWith(`${rowClient} `);
}

function assistantScope(question) {
  const resolution = resolveAssistantClient(question);
  const client = resolution.client;
  return {
    client,
    correction: resolution.correction,
    suggestion: resolution.suggestion,
    alerts: (state.alerts || []).filter((row) => matchesAssistantClient(row.client, client)),
    impact: (state.impact || []).filter((row) => matchesAssistantClient(row.client, client)),
    monthly: (state.monthly || []).filter((row) => matchesAssistantClient(row.client, client)),
    batchClients: (state.batchClients || []).filter((row) => matchesAssistantClient(row.client, client)),
  };
}

function assistantAnswer(scope, answer) {
  const correction = scope.correction ? `${scope.correction}${/[.!?]$/.test(scope.correction) ? "" : "."} ` : "";
  return `${correction}${answer}`.trim();
}

function topEntry(rows, selector) {
  return Object.entries(countBy(rows, selector)).sort((a, b) => b[1] - a[1])[0];
}

function assistantPortfolioSummary(scope) {
  const passRows = scope.alerts.filter((row) => row.overallStatus === "PASS");
  const issueRows = scope.alerts.filter((row) => row.overallStatus !== "PASS");
  const topCategory = topEntry(issueRows, (row) => row.category);
  const covered = scope.impact.filter((row) => /yes|partial/i.test(row.covered)).length;
  const coverage = scope.impact.length ? Math.round((covered / scope.impact.length) * 100) : 0;
  const label = scope.client || "the portfolio";
  return `${label} has ${scope.alerts.length} alert checks with a ${scope.alerts.length ? Math.round((passRows.length / scope.alerts.length) * 100) : 0}% pass rate and ${issueRows.length} issue row(s). ${topCategory ? `${topCategory[0]} is the largest issue category (${topCategory[1]} row(s)).` : "No issue category is currently recorded."} Bot coverage is ${coverage}% across ${scope.impact.length} task row(s).`;
}

function assistantFailureAnswer(scope, question) {
  const issueRows = scope.alerts.filter((row) => row.overallStatus !== "PASS");
  if (/which client|most fail|highest fail|worst client/.test(question) && !scope.client) {
    const ranked = Object.entries(countBy(issueRows, (row) => row.client)).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return ranked.length ? `Clients with the most issue rows: ${ranked.map(([client, total]) => `${client} (${total})`).join(", ")}.` : "No client issue rows are currently recorded.";
  }
  const topCategories = Object.entries(countBy(issueRows, (row) => row.category)).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const failedChecks = {};
  issueRows.forEach((row) => Object.entries(row.checks || {}).forEach(([check, result]) => {
    if (result === "FAIL" && !/overall status|expected threshold/i.test(check)) failedChecks[check] = (failedChecks[check] || 0) + 1;
  }));
  const checks = Object.entries(failedChecks).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const label = scope.client || "The portfolio";
  return `${label} has ${issueRows.length} issue row(s). ${topCategories.length ? `Top categories: ${topCategories.map(([category, total]) => `${category} (${total})`).join(", ")}.` : "No failed categories are recorded."} ${checks.length ? `Most frequent failed checks: ${checks.map(([check, total]) => `${check} (${total})`).join(", ")}.` : ""}`.trim();
}

function assistantPerformanceAnswer(scope) {
  if (scope.client) return assistantPortfolioSummary(scope);
  const stats = {};
  scope.alerts.forEach((row) => {
    stats[row.client] ||= { total: 0, pass: 0 };
    stats[row.client].total += 1;
    if (row.overallStatus === "PASS") stats[row.client].pass += 1;
  });
  const ranked = Object.entries(stats)
    .map(([client, value]) => [client, Math.round((value.pass / value.total) * 100), value.total])
    .sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return "No alert performance data is loaded.";
  const best = ranked.slice(0, 3).map(([client, rate, total]) => `${client} ${rate}% (${total} rows)`).join(", ");
  const worst = [...ranked].reverse().slice(0, 3).map(([client, rate, total]) => `${client} ${rate}% (${total} rows)`).join(", ");
  return `Highest pass rates: ${best}. Lowest pass rates: ${worst}.`;
}

function assistantCoverageAnswer(scope) {
  const covered = scope.impact.filter((row) => /yes|partial/i.test(row.covered));
  const uncovered = scope.impact.filter((row) => /no/i.test(row.covered));
  const rate = scope.impact.length ? Math.round((covered.length / scope.impact.length) * 100) : 0;
  const tasks = uncovered.slice(0, 5).map((row) => row.task).filter(Boolean);
  return `${scope.client || "Portfolio"} bot coverage is ${rate}%: ${covered.length} of ${scope.impact.length} task row(s) are covered or partially covered. ${uncovered.length} row(s) are uncovered${tasks.length ? `, including ${tasks.join(", ")}` : ""}.`;
}

function assistantRolloutAnswer(scope) {
  if (scope.client && scope.batchClients.length) {
    return scope.batchClients.map((row) => `${row.client} is mapped to ${row.batch}, live ${row.liveWeek}, using ${row.tool || "an unspecified tool"}.`).join(" ");
  }
  const batches = state.batches || [];
  return batches.length ? batches.map((row) => `${row.batch}: ${row.liveWeek}${row.liveDate ? ` (${row.liveDate})` : ""}`).join("; ") + "." : "No rollout schedule is loaded.";
}

function assistantMonthlyAnswer(scope) {
  if (!scope.monthly.length) return `No monthly KPI rows are loaded${scope.client ? ` for ${scope.client}` : ""}.`;
  const average = (values) => values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
  const averageSl = Math.round(average(scope.monthly.map((row) => row.sl)) * 100);
  const averageAht = average(scope.monthly.map((row) => row.aht)).toFixed(2);
  const handled = scope.monthly.reduce((sum, row) => sum + Number(row.volumeHandled || 0), 0);
  const forecast = scope.monthly.reduce((sum, row) => sum + Number(row.forecastVolume || 0), 0);
  return `${scope.client || "Portfolio"} monthly KPI summary: average SL ${averageSl}%, average AHT ${averageAht}, handled volume ${handled.toLocaleString()}, and forecast volume ${forecast.toLocaleString()} across ${scope.monthly.length} row(s).`;
}

function assistantEfficiencyAnswer(scope) {
  if (!scope.impact.length) return `No bot impact or efficiency rows are loaded${scope.client ? ` for ${scope.client}` : ""}.`;
  const improved = scope.impact.filter((row) => /save|reduc|automat|assist|efficien|faster|improv/i.test([row.after, row.efficiency, row.hcImpact].join(" ")));
  const manual = scope.impact.filter((row) => /manual|human|no change|no hc|no clear/i.test([row.after, row.efficiency, row.hcImpact].join(" ")));
  const examples = improved.slice(0, 4).map((row) => `${row.task}: ${row.efficiency || row.after}`).filter(Boolean);
  return `${scope.client || "Portfolio"} has ${improved.length} impact row(s) showing automation, savings, or reduced effort and ${manual.length} row(s) still indicating manual or human work. ${examples.length ? `Examples: ${examples.join("; ")}.` : "No quantified savings examples are recorded."}`;
}

function assistantNotesAnswer(scope) {
  const details = [
    ...scope.alerts.map((row) => row.notes),
    ...scope.impact.map((row) => row.remarks),
    ...scope.monthly.map((row) => row.drivers),
  ].map(norm).filter(Boolean);
  const unique = [...new Set(details)].slice(0, 6);
  return unique.length ? `${scope.client || "Portfolio"} observations: ${unique.join("; ")}.` : `No notes, remarks, or KPI drivers are recorded${scope.client ? ` for ${scope.client}` : ""}.`;
}

function assistantAuditAnswer(scope) {
  if (!scope.alerts.length) return `No audit or alert-check rows are loaded${scope.client ? ` for ${scope.client}` : ""}.`;
  const dates = scope.alerts.map((row) => row.auditDate).filter(Boolean).sort();
  const latest = dates[dates.length - 1] || "unavailable";
  const thresholds = scope.alerts.filter((row) => row.expectedThreshold !== "" && row.expectedThreshold != null).length;
  const frequencies = scope.alerts.filter((row) => row.expectedFreq !== "" && row.expectedFreq != null).length;
  return `${scope.client || "Portfolio"} has ${scope.alerts.length} audit row(s); the latest audit date is ${latest}. ${thresholds} row(s) include an expected threshold and ${frequencies} include an expected frequency.`;
}

function assistantRecommendationAnswer(scope) {
  const issueRows = scope.alerts.filter((row) => row.overallStatus !== "PASS");
  const topCategory = topEntry(issueRows, (row) => row.category);
  const uncovered = scope.impact.filter((row) => /no|unknown/i.test(row.covered));
  const failedChecks = {};
  issueRows.forEach((row) => Object.entries(row.checks || {}).forEach(([check, result]) => {
    if (result === "FAIL" && !/overall status|expected threshold/i.test(check)) failedChecks[check] = (failedChecks[check] || 0) + 1;
  }));
  const topCheck = Object.entries(failedChecks).sort((a, b) => b[1] - a[1])[0];
  const actions = [];
  if (topCategory) actions.push(`prioritize ${topCategory} validation (${topCategory[1]} issue rows)`);
  if (topCheck) actions.push(`address ${topCheck} (${topCheck[1]} failures)`);
  if (uncovered.length) actions.push(`review ${uncovered.length} uncovered or unknown bot-impact rows`);
  return actions.length ? `Recommended next actions for ${scope.client || "the portfolio"}: ${actions.join("; ")}.` : `No urgent corrective action is indicated for ${scope.client || "the current portfolio"}.`;
}

function assistantCountAnswer(scope, query) {
  const clientCount = new Set(scope.alerts.map((row) => row.client).filter(Boolean)).size;
  if (/client|account|program|campaign/.test(query)) return `${clientCount || assistantClients().filter((client) => !/^client \d+$/i.test(client)).length} client(s) are represented in the current scope.`;
  if (/task|impact|automation|coverage/.test(query)) return `${scope.impact.length} bot-impact task row(s) are in the current scope.`;
  if (/batch|rollout|wave|cohort/.test(query)) return `${(state.batches || []).length} batch row(s) and ${scope.batchClients.length} batch-client mapping row(s) are loaded.`;
  if (/month|kpi/.test(query)) return `${scope.monthly.length} monthly KPI row(s) are in the current scope.`;
  return `${scope.alerts.length} alert or audit row(s) are in the current scope.`;
}

function assistantClientList() {
  const clients = assistantClients().filter((client) => !/^client \d+$/i.test(client));
  return clients.length ? `Available clients: ${clients.sort().join(", ")}. You can use the full name, a close spelling, or aliases such as AEO, PDI, AIA, CDS, Philam, Philcare, or USBank.` : "No named clients are loaded.";
}

function buildAssistantAnswer(question) {
  const query = assistantText(question);
  const scope = assistantScope(query);
  if (!(state.alerts || []).length && !(state.impact || []).length && !(state.monthly || []).length) return "No dashboard data is loaded. Upload an RTM workbook in Data Management first.";
  if (scope.suggestion) return `${scope.suggestion} Available clients include: ${assistantClients().filter((client) => !/^client \d+$/i.test(client)).sort().slice(0, 8).join(", ")}.`;
  if (!query || /help|what can you|what do you|capabilit|commands|questions/.test(query)) return "I cover client names and aliases, portfolio summaries, alert and audit health, failure drivers, pass rates, bot coverage, manual work, efficiency and headcount impact, rollout schedules, monthly SL, AHT, volume, notes, source files, counts, and recommended next actions.";
  if (/hello|^hi$|^hey$/.test(query)) return "Hello. Ask me about RTM alert health, client performance, failure drivers, bot coverage, rollout dates, or monthly KPIs.";
  if (/(list|show|which|what) (the )?(available )?(clients|accounts|programs|campaigns)|client list|account list/.test(query)) return assistantClientList();
  if (/source|dataset|workbook|spreadsheet|excel|uploaded file|data origin/.test(query)) return assistantAnswer(scope, `Current source file(s): ${(state.sourceFiles || []).join(", ") || "none"}.`);
  if (/recommend|action|priority|next step|what should|improve|focus area|resolution/.test(query)) return assistantAnswer(scope, assistantRecommendationAnswer(scope));
  if (/how many|\bcount\b|total number|number of/.test(query)) return assistantAnswer(scope, assistantCountAnswer(scope, query));
  if (/rollout|batch|live week|live date|go live|golive|launch|deployment|implementation|schedule|timeline|wave|cohort/.test(query)) return assistantAnswer(scope, assistantRolloutAnswer(scope));
  if (/efficien|saving|time saved|headcount|\bhc\b|\bfte\b|before bot|after bot|before and after|benefit|manual effort|human work|productivity/.test(query)) return assistantAnswer(scope, assistantEfficiencyAnswer(scope));
  if (/note|remark|comment|observation|detail|explain|reason|\bwhy\b|driver/.test(query) && !/failure driver|issue driver/.test(query)) return assistantAnswer(scope, assistantNotesAnswer(scope));
  if (/latest audit|audit date|audit history|threshold|frequency|duration|configuration|queue group|delivery/.test(query)) return assistantAnswer(scope, assistantAuditAnswer(scope));
  if (/coverage|covered|automation|automated|uncovered|bot impact|bot support|supported by bot|scope|manual task/.test(query)) return assistantAnswer(scope, assistantCoverageAnswer(scope));
  if (/monthly|\bkpi\b|\baht\b|average handle time|handle time|service level|\bsl\b|volume|workload|demand|forecast/.test(query)) return assistantAnswer(scope, assistantMonthlyAnswer(scope));
  if (/fail|failure|error|defect|issue|risk|problem|check|category|gap|exception|discrepancy|breach|miss|non compliant|root cause|issue driver|failure driver/.test(query)) return assistantAnswer(scope, assistantFailureAnswer(scope, query));
  if (/pass|success|health|performance|best|worst|compare|comparison|quality|accuracy|compliance|score|ranking|healthy/.test(query)) return assistantAnswer(scope, assistantPerformanceAnswer(scope));
  if (/summary|overview|insight|status|how are|pulse|snapshot|picture/.test(query)) return assistantAnswer(scope, assistantPortfolioSummary(scope));
  return `I could not map that question yet. ${assistantClientList()} Try asking for a summary, audit health, failure drivers, bot coverage, efficiency, rollout, monthly KPIs, notes, counts, or next actions.`;
}

function appendAssistantMessage(role, text) {
  const messages = $("assistantMessages");
  if (!messages) return;
  const message = document.createElement("div");
  message.className = `assistant-message ${role}`;
  message.textContent = text;
  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
}

function askAssistant(question) {
  const input = $("assistantInput");
  const value = norm(question || input?.value);
  if (!value) return;
  appendAssistantMessage("user", value);
  if (input) input.value = "";
  window.setTimeout(() => appendAssistantMessage("bot", buildAssistantAnswer(value)), 120);
}

function initAssistant() {
  if ($("assistantPanel")) return;
  document.body.insertAdjacentHTML("beforeend", `
    <button class="assistant-toggle" id="assistantToggle" type="button" aria-controls="assistantPanel" aria-expanded="false">Ask RTM</button>
    <section class="assistant-panel" id="assistantPanel" aria-label="RTM data assistant" hidden>
      <header class="assistant-head">
        <div><strong>RTM Assistant</strong><span>Answers from loaded dashboard data</span></div>
        <button id="assistantClose" type="button" aria-label="Close assistant">X</button>
      </header>
      <div class="assistant-messages" id="assistantMessages" aria-live="polite"></div>
      <div class="assistant-prompts" aria-label="Suggested questions">
        <button type="button" data-assistant-question="Give me a portfolio summary">Portfolio summary</button>
        <button type="button" data-assistant-question="Which client has the most failures?">Failure leaders</button>
        <button type="button" data-assistant-question="Show bot coverage">Bot coverage</button>
        <button type="button" data-assistant-question="List available clients">Client list</button>
      </div>
      <form class="assistant-form" id="assistantForm">
        <input id="assistantInput" type="text" autocomplete="off" placeholder="Ask about alerts, clients, or rollout" aria-label="Ask the RTM assistant" />
        <button type="submit">Send</button>
      </form>
    </section>
  `);
  const setOpen = (open) => {
    $("assistantPanel").hidden = !open;
    $("assistantToggle").setAttribute("aria-expanded", String(open));
    if (open) $("assistantInput").focus();
  };
  $("assistantToggle").addEventListener("click", () => setOpen($("assistantPanel").hidden));
  $("assistantClose").addEventListener("click", () => setOpen(false));
  $("assistantForm").addEventListener("submit", (event) => {
    event.preventDefault();
    askAssistant();
  });
  document.querySelectorAll("[data-assistant-question]").forEach((button) => button.addEventListener("click", () => askAssistant(button.dataset.assistantQuestion)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("assistantPanel").hidden) setOpen(false);
  });
  appendAssistantMessage("bot", "Ask me about any client or RTM metric. I recognize aliases, close spellings, and synonyms, and I will suggest a client when a name is unclear.");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function enforceProductionDataManagementOrigin() {
  const isDataManagement = Boolean($("fileInput"));
  const isVercelPreview = window.location.hostname.endsWith(".vercel.app") && window.location.origin !== PRODUCTION_ORIGIN;
  if (isDataManagement && isVercelPreview) {
    window.location.replace(`${PRODUCTION_ORIGIN}/api/data_management`);
    return true;
  }
  return false;
}

$("fileInput")?.addEventListener("change", (event) => handleFiles([...event.target.files]));
$("clearButton")?.addEventListener("click", () => {
  localStorage.removeItem("vcoRtmDashboardData");
  localStorage.removeItem("vcoRtmDashboardSeed");
  localStorage.setItem("vcoRtmDashboardCleared", "true");
  state = emptyData();
  saveState();
  if ($("fileInput")) $("fileInput").value = "";
  if ($("statusFilter")) $("statusFilter").value = "";
  setText("uploadStatus", "All data is cleared. Upload a new workbook to begin.");
  populateFilters();
  render();
});
$("clientFilter")?.addEventListener("change", render);
$("batchFilter")?.addEventListener("change", render);
$("statusFilter")?.addEventListener("change", render);
$("exportButton")?.addEventListener("click", exportCsv);
document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const next = document.body.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("vcoRtmTheme", next);
    applyTheme(next, true);
  });
});

if (!enforceProductionDataManagementOrigin()) {
  initAssistant();
  loadInitialData();
}
