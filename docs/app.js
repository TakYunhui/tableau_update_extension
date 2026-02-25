// app.js?v=11
if (typeof tableau === "undefined") {
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

// 한글/특수문자 안전 Base64
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

    const data = await fetchJson(CONFIG_URL);
    const config = data?.dashboardsByName?.[dashboardName];

    // 1) 버전 없으면 종료
    if (!config?.version) return;

    // 2) 변경사항 없으면 종료 (dialog 자체를 안 열음)
    const items = normalizeItems(config.items);
    if (items.length === 0) return;

    // 3) 같은 버전 다시보지않기면 종료 (settings/local 둘 중 하나라도 일치하면 종료)
    const { settingsSeen, localSeen } = getSeenVersions(dashboardName);
    if (settingsSeen === config.version || localSeen === config.version) return;

    // 4) dialog 재-fetch 없이 payload로 전달
    const payload = JSON.stringify({
      dashboardName,
      version: config.version,
      title: config.title || "업데이트 안내",
      items,
      extVer: EXT_VER
    });

    const dialogUrl = buildDialogUrl(payload);

    try {
      await tableau.extensions.ui.displayDialogAsync(dialogUrl, payload, {
        width: 600,
        height: 520
      });
    } catch (err) {
      // ✅ 사용자가 X/ESC 등으로 닫은 건 정상: 조용히 무시
      const msg = String(err?.message || err);
      if (msg.includes("dialog-closed-by-user")) return;

      // 그 외 진짜 오류만 콘솔에 남김
      console.error(err);
    }
  } catch (e) {
    console.error(e);
  }
})();
