let currentView = "month";
let zipMap, zipHeat;
const $ = (sel) => document.querySelector(sel);

const elSub = $("#kpiSubmissions");
const elZip = $("#kpiZipCoverage");
const elUpdated = $("#kpiUpdated");

const rankingList = $("#rankingList");
const zipTbody = $("#zipTable tbody");
const topicsWrap = $("#topics");

let chartNeeds;

async function api(section) {
  // page base: http://127.0.0.1:8081/verde/
  const base = new URL(".", window.location.href);
  const url = new URL("mock/dashboard.json", base).toString();

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok)
    throw new Error(
      `Mock JSON fetch failed: ${res.status} ${res.statusText} @ ${url}`,
    );

  const data = await res.json();
  if (!(section in data))
    throw new Error(`Missing section "${section}" in dashboard.json`);
  return data[section];
}

function niceDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function destroyChart(ch) {
  if (ch) ch.destroy();
  return null;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadAll() {
  $("#btnRefresh").disabled = true;
  $("#btnRefresh").textContent = "Refreshing…";

  try {
    /* const [summary, needsTs, topNeeds, zipDist, textTopics] = await Promise.all(
      [
        api("/api/summary"),
        api("/api/needs-timeseries"),
        api("/api/top-needs"),
        api("/api/zip-distribution"),
        api("/api/text-topics"),
      ],
    );*/
    const [summary, needsTs, topNeeds, zipDist, textTopics] = await Promise.all(
      [
        api("summary"),
        api("needsTimeseries"),
        api("topNeeds"),
        api("zipDistribution"),
        api("textTopics"),
      ],
    );

    // KPI
    elSub.textContent = summary.submissions ?? "—";
    elZip.textContent = summary.zipCoverage ?? "—";
    elUpdated.textContent = niceDate(summary.lastUpdated ?? "");

    // Needs chart
    chartNeeds = destroyChart(chartNeeds);
    chartNeeds = new Chart($("#chartNeeds"), {
      type: "line",
      data: {
        labels: needsTs.x,
        datasets: (needsTs.series ?? []).map((s) => ({
          label: s.label,
          data: s.values,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 0,
        })),
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#334155", font: { weight: "700" } },
          },
          tooltip: { intersect: false, mode: "index" },
        },
        scales: {
          x: {
            ticks: { color: "#475569" },
            grid: { color: "rgba(15,23,42,0.06)" },
          },
          y: {
            ticks: { color: "#475569" },
            grid: { color: "rgba(15,23,42,0.06)" },
          },
        },
      },
    });

    // Top needs ranking
    rankingList.innerHTML = "";
    for (const item of topNeeds.items ?? []) {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="label">${escapeHtml(item.label)}</span>
        <span class="count">${item.count}</span>
      `;
      rankingList.appendChild(li);
    }

    // ZIP heatmap
    renderZipHeatmap(zipDist.items ?? []);
    const zitems = (zipDist.items ?? [])
      .slice()
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
    const max = Math.max(1, ...zitems.map((x) => x.count ?? 0));
    zipTbody.innerHTML = "";
    for (const it of zitems) {
      const pct = Math.round(((it.count ?? 0) / max) * 100);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(it.zip)}</td>
        <td class="right">${it.count ?? 0}</td>
        <td><div class="bar"><i style="width:${pct}%"></i></div></td>
      `;
      zipTbody.appendChild(tr);
    }

    // Text topics (keyword cards + sparkline)
    topicsWrap.innerHTML = "";
    for (const t of (textTopics.items ?? []).slice(0, 8)) {
      const card = document.createElement("div");
      card.className = "topic";
      const canvasId = `spark_${Math.random().toString(16).slice(2)}`;
      card.innerHTML = `
        <div class="topicHead">
          <div class="topicName">${escapeHtml(t.topic)}</div>
          <div class="topicTotal">Total: ${t.total}</div>
        </div>
        <canvas class="spark" id="${canvasId}" height="34"></canvas>
      `;
      topicsWrap.appendChild(card);

      // sparkline mini chart
      new Chart(document.getElementById(canvasId), {
        type: "line",
        data: {
          labels: textTopics.x,
          datasets: [
            { data: t.values, borderWidth: 2, pointRadius: 0, tension: 0.35 },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } },
        },
      });
    }
  } catch (e) {
    console.error(e);
    alert("Failed to load mock data. Check your PHP server console.");
  } finally {
    $("#btnRefresh").disabled = false;
    $("#btnRefresh").textContent = "Refresh";
  }
}

function renderZipHeatmap(items) {
  // ZIP centroid lookup (Santa Clara County-ish). 你可以以后换成真实 ZIP->lat/lng 数据。
  const ZIP_CENTROIDS = {
    95112: [37.344, -121.882],
    95116: [37.3496, -121.851],
    95050: [37.3513, -121.953],
    95122: [37.3308, -121.834],
    95126: [37.324, -121.916],
    95110: [37.342, -121.906],
    95117: [37.311, -121.961],
    95128: [37.316, -121.936],
    95127: [37.37, -121.814],
    95051: [37.348, -121.985],
    95054: [37.392, -121.954],
    95035: [37.432, -121.899],
    95123: [37.244, -121.833],
    95133: [37.372, -121.86],
  };

  // init map once
  if (!zipMap) {
    zipMap = L.map("zipMap", { zoomControl: true }).setView(
      [37.33, -121.9],
      11,
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(zipMap);
  }

  // convert zip counts to heat points: [lat, lng, intensity]
  const points = [];
  let max = 1;
  for (const it of items) max = Math.max(max, it.count ?? 0);

  for (const it of items) {
    const zip = String(it.zip ?? "");
    const c = ZIP_CENTROIDS[zip];
    if (!c) continue;

    const intensity = (it.count ?? 0) / max; // 0..1
    points.push([c[0], c[1], intensity]);
  }

  // remove old heat
  if (zipHeat) {
    zipHeat.remove();
    zipHeat = null;
  }

  zipHeat = L.heatLayer(points, {
    radius: 35,
    blur: 25,
    maxZoom: 13,
  }).addTo(zipMap);
}

// Controls
document.querySelectorAll(".seg").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".seg")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentView = btn.dataset.view || "month";
    loadAll();
  });
});

$("#btnRefresh").addEventListener("click", loadAll);
$("#btnDownload").addEventListener("click", async () => {
  alert("Mock mode: no report endpoint yet.");
});
loadAll();
