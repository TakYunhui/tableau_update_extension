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
  const res = await fetch(`${url}?v=${Date.now()}`); // 캐시 방지
  if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
  return res.json();
}

/**
 * dialog.html 경로를 안전하게 만들기
 * - index.html이 GitHub Pages 루트(또는 폴더)에서 열리므로
 * - 같은 폴더의 dialog.html을 상대경로로 참조하면 안정적
 */
function getDialogUrl() {
  // 예: https://.../tableau_update_extension/index.html
  // -> https://.../tableau_update_extension/dialog.html
  const u = new URL(window.location.href);
  u.pathname = u.pathname.replace(/index\.html?$/i, "dialog.html");
  return u.toString();
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

    // 같은 버전 다시보지않기면 종료
    const seen = localStorage.getItem(storageKey(dashboardName));
    if (seen === config.version) return;

    // Dialog로 팝업 띄우기
    // payload에는 필요한 최소만 넘기고, dialog에서 updates.json을 다시 fetch해서 렌더링(권장)
    const payload = JSON.stringify({
      dashboardName,
      version: config.version,
      // title은 dialog에서 config.title을 쓰지만, 혹시 못 가져올 때 대비로 같이 넘겨도 됨
      title: config.title || "업데이트 안내"
    });

    await tableau.extensions.ui.displayDialogAsync(
      getDialogUrl(),
      payload,
      { width: 600, height: 520 }
    );

    // 닫기/다시보지않기는 dialog.js에서 처리한다.
  } catch (e) {
    console.error(e);
    const d = document.getElementById("debug");
    if (d) {
      d.style.display = "block";
      d.textContent = String(e?.message || e);
    }
  }
})();
