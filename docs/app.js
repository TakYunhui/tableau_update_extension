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

// 배포/캐시 이슈 있을 때만 숫자 올려서 쓰면 됨(선택)
const EXT_VER = "1";

function storageKey(dashboardName) {
  return `updatePopup_seenVersion_${dashboardName}`;
}

async function fetchJson(url) {
  const res = await fetch(`${url}?cb=${Date.now()}`); // 캐시 방지
  if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
  return res.json();
}

function getDialogUrl() {
  // ✅ Cloud에서 window.location이 index.html이 아닐 수도 있어서 "상대경로"로 생성
  // ✅ dialog도 캐시 방지 파라미터 강제 부여
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

(async function main() {
  try {
    await tableau.extensions.initializeAsync();

    const dashboard = tableau.extensions.dashboardContent.dashboard;
    const dashboardName = (dashboard.name || "").trim();

    const data = await fetchJson(CONFIG_URL);
    const config = data?.dashboardsByName?.[dashboardName];

    // 1) 업데이트(버전) 없으면 종료
    if (!config?.version) return;

    // 2) ✅ 변경 사항(items) 없으면 아예 dialog를 열지 않음 (플리커 방지 핵심)
    const items = normalizeItems(config.items);
    if (items.length === 0) return;

    // 3) 같은 버전 다시보지않기면 종료
    const seen = localStorage.getItem(storageKey(dashboardName));
    if (seen === config.version) return;

    // 4) ✅ dialog에서 재-fetch 하지 않게 items까지 payload로 넘김 (불일치/플리커 방지)
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
