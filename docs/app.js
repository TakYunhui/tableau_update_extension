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

function storageKey(dashboardName) {
  return `updatePopup_seenVersion_${dashboardName}`;
}

async function fetchJson(url) {
  const res = await fetch(`${url}?v=${Date.now()}`);
  if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
  return res.json();
}

function getDialogUrl() {
  const u = new URL(window.location.href);
  u.pathname = u.pathname.replace(/index\.html?$/i, "dialog.html");
  return u.toString();
}

function hasItems(config) {
  const items = Array.isArray(config?.items) ? config.items : [];
  return items.some((x) => String(x ?? "").trim().length > 0);
}

(async function main() {
  try {
    await tableau.extensions.initializeAsync();

    const dashboard = tableau.extensions.dashboardContent.dashboard;
    const dashboardName = (dashboard.name || "").trim();

    const data = await fetchJson(CONFIG_URL);
    const config = data?.dashboardsByName?.[dashboardName];

    // 업데이트 없으면 종료
    if (!config || !config.version) return;

    // ✅ 변경 사항(items) 없으면 아예 띄우지 않음
    if (!hasItems(config)) return;

    // 같은 버전 다시보지않기면 종료
    const seen = localStorage.getItem(storageKey(dashboardName));
    if (seen === config.version) return;

    const payload = JSON.stringify({
      dashboardName,
      version: config.version,
      title: config.title || "업데이트 안내"
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
