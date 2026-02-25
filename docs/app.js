// app.js
if (typeof tableau === "undefined") {
  const d = document.getElementById("debug");
  if (d) {
    d.style.display = "block";
    d.textContent = "tableau undefined (API script not loaded)";
  }
  throw new Error("tableau is not defined");
}

const CONFIG_URL = "https://takyunhui.github.io/tableau_update_extension/updates.json";
const EXT_VER = "1";

function seenKey(dashboardName) {
  // settings 키는 문자열이면 OK. 너무 길면 곤란하니 간단히.
  return `seenVersion:${dashboardName}`;
}

async function fetchJson(url) {
  const res = await fetch(`${url}?cb=${Date.now()}`);
  if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
  return res.json();
}

function getDialogUrl() {
  const base = new URL(window.location.href);
  const dialog = new URL("dialog.html", base);
  dialog.searchParams.set("v", EXT_VER);
  dialog.searchParams.set("cb", String(Date.now()));
  return dialog.toString();
}

function normalizeItems(items) {
  const arr = Array.isArray(items) ? items : [];
  return arr.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function getSeenVersionFromSettings(dashboardName) {
  // settings는 initializeAsync 이후 사용 가능
  return tableau.extensions.settings.get(seenKey(dashboardName)) || null;
}

(async function main() {
  try {
    await tableau.extensions.initializeAsync();

    const dashboard = tableau.extensions.dashboardContent.dashboard;
    const dashboardName = (dashboard.name || "").trim();

    const data = await fetchJson(CONFIG_URL);
    const config = data?.dashboardsByName?.[dashboardName];

    // 1) 버전 없으면 종료
    if (!config?.version) return;

    // 2) 변경사항 없으면 종료 (아예 dialog 안 열기)
    const items = normalizeItems(config.items);
    if (items.length === 0) return;

    // 3) 같은 버전 다시보지않기면 종료 (settings 기반)
    const seen = getSeenVersionFromSettings(dashboardName);
    if (seen === config.version) return;

    // 4) dialog에서 재-fetch 안 하게 payload로 다 넘김
    const payload = JSON.stringify({
      dashboardName,
      version: config.version,
      title: config.title || "업데이트 안내",
      items
    });

    await tableau.extensions.ui.displayDialogAsync(
      getDialogUrl(),
      payload,
      { width: 600, height: 520 }
    );
  } catch (e) {
    console.error(e);
    const d = document.getElementById("debug");
    if (d) {
      d.style.display = "block";
      d.textContent = String(e?.message || e);
    }
  }
})();
