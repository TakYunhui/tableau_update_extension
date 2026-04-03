// app.js?v=17
if (typeof tableau === "undefined") {
  throw new Error("tableau is not defined");
}

const CONFIG_URL = "https://takyunhui.github.io/tableau_update_extension/updates.json";
const EXT_VER = "17";

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

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeContext(context) {
  const source = context && typeof context === "object" ? context : {};
  return {
    purpose: normalizeText(source.purpose),
    usage: normalizeText(source.usage),
    collaboration: normalizeText(source.collaboration)
  };
}

function normalizeDetails(details) {
  const arr = Array.isArray(details) ? details : [];
  return arr
    .map((detail) => {
      const source = detail && typeof detail === "object" ? detail : {};
      const normalized = {
        title: normalizeText(source.title),
        purpose: normalizeText(source.purpose),
        usage: normalizeItems(source.usage),
        collaboration: normalizeText(source.collaboration)
      };

      if (!normalized.title) return null;
      if (!normalized.purpose && normalized.usage.length === 0 && !normalized.collaboration) return null;
      return normalized;
    })
    .filter(Boolean);
}

function normalizeConfig(config) {
  if (!config || typeof config !== "object") return null;

  return {
    version: normalizeText(config.version),
    summary: normalizeText(config.summary),
    highlights: normalizeItems(config.highlights ?? config.items),
    context: normalizeContext(config.context),
    details: normalizeDetails(config.details)
  };
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

// ✅ “한 번 닫으면 다음엔 안 뜸”을 보장하려면:
//    dialog를 열기 직전에 seen 저장을 먼저 해버리면 됨
async function markSeen(dashboardName, version) {
  // localStorage는 즉시 반영
  localStorage.setItem(storageKey(dashboardName), version);

  // settings는 Cloud 안정성용(비동기 저장)
  tableau.extensions.settings.set(seenKey(dashboardName), version);
  await tableau.extensions.settings.saveAsync();
}

(async function main() {
  try {
    await tableau.extensions.initializeAsync();

    const dashboardName = (tableau.extensions.dashboardContent.dashboard.name || "").trim();

    const data = await fetchJson(CONFIG_URL);
    const config = normalizeConfig(data?.dashboardsByName?.[dashboardName]);

    // 1) 버전 없으면 종료
    if (!config?.version) return;

    // 2) 변경사항 없으면 종료
    if (!config.summary && config.highlights.length === 0 && config.details.length === 0) return;

    // 3) 이미 본 버전이면 종료
    const { settingsSeen, localSeen } = getSeenVersions(dashboardName);
    if (settingsSeen === config.version || localSeen === config.version) return;

    // 4) payload
    const payload = JSON.stringify({
      dashboardName,
      version: config.version,
      summary: config.summary,
      highlights: config.highlights,
      context: config.context,
      details: config.details,
      extVer: EXT_VER
    });

    // ✅ 중요: dialog 열기 전에 먼저 seen 저장
    await markSeen(dashboardName, config.version);

    // 5) dialog 표시
    const dialogUrl = buildDialogUrl(payload);

    try {
      await tableau.extensions.ui.displayDialogAsync(dialogUrl, payload, {
        width: 600,
        height: 520
      });
    } catch (err) {
      // 사용자가 X/ESC로 닫는 건 정상: 조용히 무시
      const msg = String(err?.message || err);
      if (msg.includes("dialog-closed-by-user")) return;

      console.error(err);
    }
  } catch (e) {
    console.error(e);
  }
})();
