// app.js?v=9
if (typeof tableau === "undefined") {
  const d = document.getElementById("debug");
  if (d) {
    d.style.display = "block";
    d.textContent = "tableau undefined (API script not loaded)";
  }
  throw new Error("tableau is not defined");
}

const CONFIG_URL = "https://takyunhui.github.io/tableau_update_extension/updates.json";
const EXT_VER = "9";

function seenKey(dashboardName) {
  return `seenVersion:${dashboardName}`;
}
function storageKey(dashboardName) {
  return `updatePopup_seenVersion_${dashboardName}`;
}

function debugLog(msg) {
  console.log("[UpdatePopup]", msg);
  const d = document.getElementById("debug");
  if (d) {
    d.style.display = "block";
    d.textContent += (d.textContent ? "\n" : "") + String(msg);
  }
}

async function fetchJson(url) {
  const res = await fetch(`${url}?cb=${Date.now()}`); // 캐시 방지
  if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
  return res.json();
}

function getDialogUrl() {
  // ✅ Cloud에서 index.html 형태/쿼리 보존에 기대지 않음: 상대경로로 생성
  const base = new URL(window.location.href);
  const dialog = new URL("dialog.html", base);

  // ✅ dialog 자체 캐시 방지
  dialog.searchParams.set("v", EXT_VER);
  dialog.searchParams.set("cb", String(Date.now()));

  return dialog.toString();
}

function normalizeItems(items) {
  const arr = Array.isArray(items) ? items : [];
  return arr.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function getSeenVersions(dashboardName) {
  // settings는 initializeAsync 이후 사용 가능
  const settingsSeen = tableau.extensions.settings.get(seenKey(dashboardName)) || null;
  const localSeen = localStorage.getItem(storageKey(dashboardName)) || null;
  return { settingsSeen, localSeen };
}

(async function main() {
  try {
    await tableau.extensions.initializeAsync();

    const dashboard = tableau.extensions.dashboardContent.dashboard;
    const dashboardName = (dashboard.name || "").trim();

    debugLog(`dashboardName="${dashboardName}"`);

    const data = await fetchJson(CONFIG_URL);
    const config = data?.dashboardsByName?.[dashboardName];

    debugLog(`config.version="${config?.version ?? ""}"`);
    debugLog(`raw items length=${Array.isArray(config?.items) ? config.items.length : 0}`);

    // 1) 버전 없으면 종료
    if (!config?.version) {
      debugLog("STOP: no version");
      return;
    }

    // 2) 변경사항 없으면 종료 (아예 dialog 안 열기 = 플리커 방지 핵심)
    const items = normalizeItems(config.items);
    debugLog(`normalized items length=${items.length}`);

    if (items.length === 0) {
      debugLog("STOP: no items");
      return;
    }

    // 3) 같은 버전 다시보지않기면 종료 (settings/local 둘 중 하나라도 일치하면 종료)
    const { settingsSeen, localSeen } = getSeenVersions(dashboardName);
    debugLog(`seen(settings)="${settingsSeen ?? ""}", seen(local)="${localSeen ?? ""}"`);

    if (settingsSeen === config.version || localSeen === config.version) {
      debugLog("STOP: already seen this version");
      return;
    }

    // 4) dialog에서 재-fetch 하지 않게 payload로 다 넘김
    const payload = JSON.stringify({
      dashboardName,
      version: config.version,
      title: config.title || "업데이트 안내",
      items,
      extVer: EXT_VER
    });

    debugLog(`OPEN dialog url=${getDialogUrl()}`);

    await tableau.extensions.ui.displayDialogAsync(
      getDialogUrl(),
      payload,
      { width: 600, height: 520 }
    );
  } catch (e) {
    console.error(e);
    debugLog(`ERROR: ${String(e?.message || e)}`);
  }
})();
