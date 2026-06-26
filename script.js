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

const $ = (id) => document.getElementById(id);
const norm = (value) => String(value ?? "").trim();
const percent = (value) => `${Math.round((value || 0) * 100)}%`;

function loadState() {
  try {
    return JSON.parse(localStorage.getItem("vcoRtmDashboardData")) || structuredClone(sampleData);
  } catch {
    return structuredClone(sampleData);
  }
}

async function loadInitialData() {
  if (window.VCO_RTM_ACTUAL_DATA) {
    state = window.VCO_RTM_ACTUAL_DATA;
    localStorage.setItem("vcoRtmDashboardSeed", JSON.stringify(state));
    $("uploadStatus").textContent = `Loaded actual data: ${(state.sourceFiles || []).join(", ")}`;
    populateFilters();
    render();
    return;
  }
  try {
    const response = await fetch("/data", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state = await response.json();
    localStorage.setItem("vcoRtmDashboardSeed", JSON.stringify(state));
    $("uploadStatus").textContent = `Loaded actual data: ${(state.sourceFiles || []).join(", ")}`;
  } catch {
    try {
      state = JSON.parse(localStorage.getItem("vcoRtmDashboardSeed")) || loadState();
      $("uploadStatus").textContent = "Using last loaded local data.";
    } catch {
      state = loadState();
      $("uploadStatus").textContent = "Using starter sample data.";
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
  $("uploadStatus").textContent = "Reading uploaded workbook(s)...";
  const form = new FormData();
  files.forEach((file) => form.append("files", file, file.name));
  let next;
  try {
    const response = await fetch("/upload", { method: "POST", body: form });
    if (!response.ok) throw new Error(`Upload failed with HTTP ${response.status}`);
    next = await response.json();
  } catch (error) {
    $("uploadStatus").textContent = `Upload failed. Start the local Python server and try again. ${error.message}`;
    return;
  }
  state = {
    batches: next.batches.length ? next.batches : state.batches,
    batchClients: next.batchClients?.length ? next.batchClients : state.batchClients,
    alerts: next.alerts.length ? next.alerts : state.alerts,
    impact: next.impact.length ? next.impact : state.impact,
    monthly: next.monthly.length ? next.monthly : state.monthly,
    sourceFiles: next.sourceFiles,
  };
  saveState();
  $("uploadStatus").textContent = `Loaded ${next.sourceFiles.length} file(s): ${next.sourceFiles.join(", ")}`;
  populateFilters();
  render();
}

function selectedRows() {
  const client = $("clientFilter").value;
  const status = $("statusFilter").value;
  return state.alerts.filter((row) => (!client || row.client === client) && (!status || row.overallStatus === status));
}

function visibleImpact() {
  const client = $("clientFilter").value;
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
  ctx.fillStyle = "#64748b";
  ctx.textAlign = "center";
  ctx.fillText(message, width / 2, height / 2);
}

function drawBarChart(id, labels, values, color = "#2563eb", horizontal = false) {
  const { ctx, width, height } = canvasSetup(id);
  if (!labels.length) return drawEmpty(ctx, width, height);
  const max = Math.max(...values, 1);
  const left = 44;
  const top = 18;
  const chartW = width - 70;
  const chartH = height - 64;
  ctx.strokeStyle = "#d7dde6";
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
      ctx.fillStyle = "#111827";
      ctx.textAlign = "left";
      ctx.fillText(String(label).slice(0, 18), left + 4, top + i * slot + 20);
      ctx.textAlign = "right";
      ctx.fillText(values[i], left + bar + 28, top + i * slot + 20);
    } else {
      const barW = chartW / labels.length - 12;
      const x = left + i * (chartW / labels.length) + 6;
      const y = top + chartH - bar;
      ctx.fillRect(x, y, Math.max(14, barW), bar);
      ctx.fillStyle = "#111827";
      ctx.textAlign = "center";
      ctx.fillText(values[i], x + barW / 2, y - 4);
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
  ctx.strokeStyle = "#d7dde6";
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, top + chartH);
  ctx.lineTo(left + chartW, top + chartH);
  ctx.stroke();
  ctx.strokeStyle = "#2563eb";
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
    ctx.fillStyle = "#2563eb";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.textAlign = "center";
    ctx.fillText(`${value}%`, x, y - 9);
    ctx.fillText(String(labels[i]).slice(5), x, top + chartH + 18);
  });
}

function drawDoughnut(id, labels, values) {
  const { ctx, width, height } = canvasSetup(id);
  const total = values.reduce((a, b) => a + b, 0);
  if (!total) return drawEmpty(ctx, width, height);
  const colors = ["#16a34a", "#dc2626", "#d97706", "#64748b"];
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
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(cx, cy, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.font = "700 22px Segoe UI, Arial";
  ctx.fillText(String(total), cx, cy + 7);
  ctx.font = "12px Segoe UI, Arial";
  labels.forEach((label, i) => {
    const x = 24 + (i % 2) * (width / 2);
    const y = 220 + Math.floor(i / 2) * 22;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x, y - 10, 10, 10);
    ctx.fillStyle = "#111827";
    ctx.textAlign = "left";
    ctx.fillText(`${label}: ${values[i]}`, x + 16, y);
  });
}

function populateFilters() {
  const clients = [...new Set([...state.alerts, ...state.impact, ...state.monthly].map((r) => r.client).filter(Boolean))].sort();
  const batches = [...new Set(state.batches.map((r) => r.batch).filter(Boolean))];
  $("clientFilter").innerHTML = `<option value="">All clients</option>${clients.map((c) => `<option>${escapeHtml(c)}</option>`).join("")}`;
  $("batchFilter").innerHTML = `<option value="">All batches</option>${batches.map((b) => `<option>${escapeHtml(b)}</option>`).join("")}`;
}

function renderKpis(rows) {
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
  drawDoughnut("statusChart", Object.keys(statusCounts), Object.values(statusCounts));

  const categoryFails = countBy(rows.filter((r) => r.overallStatus !== "PASS"), (r) => r.category);
  drawBarChart("categoryChart", Object.keys(categoryFails), Object.values(categoryFails), "#dc2626", true);

  const byDate = {};
  rows.forEach((r) => {
    const d = r.auditDate || "Unmapped";
    byDate[d] ||= { total: 0, pass: 0 };
    byDate[d].total += 1;
    if (r.overallStatus === "PASS") byDate[d].pass += 1;
  });
  const dates = Object.keys(byDate).sort();
  drawLineChart("trendChart", dates, dates.map((d) => Math.round((byDate[d].pass / byDate[d].total) * 100)));

  const coverage = countBy(visibleImpact(), (r) => /partial/i.test(r.covered) ? "Partial" : /yes/i.test(r.covered) ? "Covered" : /no/i.test(r.covered) ? "Not Covered" : "Unknown");
  drawBarChart("coverageChart", Object.keys(coverage), Object.values(coverage), "#0f766e");

  const monthlyRows = state.monthly.filter((r) => !$("clientFilter").value || r.client === $("clientFilter").value);
  drawBarChart("monthlyChart", monthlyRows.map((r) => `${r.client} ${r.month}`), monthlyRows.map((r) => Math.round(r.sl * 100)), "#0f766e");
}

function renderTimeline() {
  const selectedBatch = $("batchFilter").value;
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
  $("dataSubtitle").textContent = `Source: ${(state.sourceFiles || []).join(", ") || "Starter sample"}`;
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

$("fileInput").addEventListener("change", (event) => handleFiles([...event.target.files]));
$("clearButton").addEventListener("click", () => {
  localStorage.removeItem("vcoRtmDashboardData");
  state = JSON.parse(localStorage.getItem("vcoRtmDashboardSeed") || "null") || structuredClone(sampleData);
  $("uploadStatus").textContent = state.sourceFiles?.length ? `Reloaded actual data: ${state.sourceFiles.join(", ")}` : "Using starter sample data.";
  populateFilters();
  render();
});
$("clientFilter").addEventListener("change", render);
$("batchFilter").addEventListener("change", render);
$("statusFilter").addEventListener("change", render);
$("exportButton").addEventListener("click", exportCsv);

loadInitialData();
