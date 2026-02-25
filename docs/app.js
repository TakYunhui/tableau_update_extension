// app.js?v=10
if (typeof tableau === "undefined") {
  const d = document.getElementById("debug");
  if (d) {
    d.style.display = "block";
    d.textContent = "tableau undefined (API script not loaded)";
  }
  throw new Error("tableau is not defined");
}

const CONFIG_URL = "https://takyunhui.github.io/tableau_update_extension/updates.json";
const EXT_VER = "10";

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
  const res = await fetch(`${url}?cb=${Date.now()}`);
  if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
  return res.json();
}

function normalizeItems(items) {
  const arr = Array.isArray(items) ? items : [];
  return arr.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function getSeenVersions(dashboardName) {
  const settingsSeen = tableau.extensions.settings.get(seenKey(dashboardName)) || null;
  const localSeen = localStorage.getItem(storageKey(dashboardName)) || null;
  return { settingsSeen, localSeen };
}

// ✅ payload를 URL query로도 실어 보내기 (dialogPayload가 비는 Cloud 케이스 대응)
function buildDialogUrl(payloadString) {
  const base = new URL(window.location.href);
  const dialog = new URL("dialog.html", base);

  dialog.searchParams.set("v", EXT_VER);
  dialog.searchParams.set("cb", String(Date.now()));

  // URL에 payload를 같이 실어 보냄 (fallback 용)
  // payload가 커지면 URL 길이 문제가 생길 수 있지만, 지금 구조는 충분히 짧음
  dialog.searchParams.set("p", encodeURIComponent(payloadString));

  return dialog.toString();
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

    if (!config?.version) {
      debugLog("STOP: no version");
      return;
    }

    const items = normalizeItems(config.items);
    debugLog(`items.length=${items.length}`);

    if (items.length === 0) {
      debugLog("STOP: no items");
      return;
    }

    const { settingsSeen, localSeen } = getSeenVersions(dashboardName);
    debugLog(`seen(settings)="${settingsSeen ?? ""}", seen(local)="${localSeen ?? ""}"`);

    if (settingsSeen === config.version || localSeen === config.version) {
      debugLog("STOP: already seen");
      return;
    }

    const payload = JSON.stringify({
      dashboardName,
      version: config.version,
      title: config.title || "업데이트 안내",
      items,
      extVer: EXT_VER
    });

    const dialogUrl = buildDialogUrl(payload);
    debugLog(`OPEN dialog url=${dialogUrl}`);

    // ✅ dialogPayload로도 전달 (되는 환경에서는 이게 더 깔끔)
    await tableau.extensions.ui.displayDialogAsync(
      dialogUrl,
      payload,
      { width: 600, height: 520 }
    );
  } catch (e) {
    console.error(e);
    debugLog(`ERROR: ${String(e?.message || e)}`);
  }
})();
