// app.js?v=11
if (typeof tableau === "undefined") {
  const d = document.getElementById("debug");
  if (d) {
    d.style.display = "block";
    d.textContent = "tableau undefined (API script not loaded)";
  }
  throw new Error("tableau is not defined");
}

const CONFIG_URL = "https://takyunhui.github.io/tableau_update_extension/updates.json";
const EXT_VER = "11";

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

// ✅ Base64로 안전하게 URL에 실어보내기(한글/특수문자 안전)
function toB64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function buildDialogUrl(payloadString) {
  const base = new URL(window.location.href);
  const dialog = new URL("dialog.html", base);

  dialog.searchParams.set("v", EXT_VER);
  dialog.searchParams.set("cb", String(Date.now()));
  dialog.searchParams.set("p64", toB64(payloadString));

  return dialog.toString();
}

(async function main() {
  try {
    await tableau.extensions.initializeAsync();

    const dashboardName = (tableau.extensions.dashboardContent.dashboard.name || "").trim();
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

    try {
      await tableau.extensions.ui.displayDialogAsync(dialogUrl, payload, { width: 600, height: 520 });
    } catch (err) {
      // ✅ 사용자가 닫은 건 정상(에러로 취급하지 않음)
      const msg = String(err?.message || err);
      if (msg.includes("dialog-closed-by-user")) {
        debugLog("Dialog closed by user (ignored).");
        return;
      }
      throw err;
    }
  } catch (e) {
    console.error(e);
    debugLog(`ERROR: ${String(e?.message || e)}`);
  }
})();
