// dialog.js
const CONFIG_URL = "https://takyunhui.github.io/tableau_update_extension/updates.json";

function storageKey(dashboardName) {
  return `updatePopup_seenVersion_${dashboardName}`;
}

async function fetchJson(url) {
  const res = await fetch(`${url}?v=${Date.now()}`);
  if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
  return res.json();
}

function formatDateFromVersion(version) {
  if (!version) return "";
  const parts = String(version).split("-").slice(0, 3); // YYYY-MM-DD
  if (parts.length !== 3) return "";
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

function normalizeItems(items) {
  const arr = Array.isArray(items) ? items : [];
  return arr
    .map((x) => String(x ?? "").trim())
    .filter((s) => s.length > 0);
}

function renderPopup(config) {
  const titleEl = document.getElementById("title");
  const itemsEl = document.getElementById("items");
  const updatedAtEl = document.getElementById("updatedAt");

  titleEl.textContent = config.title || "업데이트 안내";

  const items = normalizeItems(config.items);
  itemsEl.innerHTML = "";

  for (const t of items) {
    const li = document.createElement("li");
    li.textContent = t;
    itemsEl.appendChild(li);
  }

  const d = formatDateFromVersion(config.version);
  updatedAtEl.textContent = d ? `업데이트 일자: ${d}` : "";
}

(async function main() {
  try {
    await tableau.extensions.initializeDialogAsync();

    const payloadRaw = tableau.extensions.ui.dialogPayload;
    let payload = {};
    try { payload = JSON.parse(payloadRaw || "{}"); } catch (_) {}

    const dashboardName = (payload.dashboardName || "").trim();

    const data = await fetchJson(CONFIG_URL);
    const config = data?.dashboardsByName?.[dashboardName];

    // ✅ 변경사항 없으면 dialog를 즉시 닫아버림 (안전장치)
    const items = normalizeItems(config?.items);
    if (!config?.version || items.length === 0) {
      tableau.extensions.ui.closeDialog("no_items");
      return;
    }

    renderPopup(config);

    const dontBtn = document.getElementById("dontShowBtn");
    dontBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      localStorage.setItem(storageKey(dashboardName), config.version);
      tableau.extensions.ui.closeDialog("dont_show");
    };
  } catch (e) {
    console.error(e);
    const itemsEl = document.getElementById("items");
    if (itemsEl) {
      itemsEl.innerHTML = "";
      const li = document.createElement("li");
      li.textContent = `오류: ${String(e?.message || e)}`;
      itemsEl.appendChild(li);
    }
  }
})();
