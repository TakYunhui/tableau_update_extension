// dialog.js?v=11

function seenKey(dashboardName) {
  return `seenVersion:${dashboardName}`;
}
function storageKey(dashboardName) {
  return `updatePopup_seenVersion_${dashboardName}`;
}

function fromB64(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

function formatDateFromVersion(version) {
  if (!version) return "";
  const parts = String(version).split("-").slice(0, 3);
  if (parts.length !== 3) return "";
  return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

function normalizeItems(items) {
  const arr = Array.isArray(items) ? items : [];
  return arr.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderList(items) {
  const itemsEl = document.getElementById("items");
  if (!itemsEl) return;
  itemsEl.innerHTML = "";
  for (const t of items) {
    const li = document.createElement("li");
    li.textContent = t;
    itemsEl.appendChild(li);
  }
}

// payload 읽기: dialogPayload 우선 -> 없으면 URL p64
function readPayload() {
  const raw = tableau.extensions.ui.dialogPayload;
  if (raw && String(raw).trim().length > 0) {
    try { return JSON.parse(raw); } catch { /* fallthrough */ }
  }

  const qs = new URLSearchParams(window.location.search);
  const p64 = qs.get("p64");
  if (p64) {
    try { return JSON.parse(fromB64(p64)); } catch { /* fallthrough */ }
  }

  return {};
}

(async function main() {
  try {
    await tableau.extensions.initializeDialogAsync();

    const payload = readPayload();

    const dashboardName = (payload.dashboardName || "").trim();
    const version = payload.version || "";
    const title = payload.title || "업데이트 안내";
    const items = normalizeItems(payload.items);

    // payload가 비정상이면 사용자에게 보이지 않게 조용히 닫음
    if (!dashboardName || !version || items.length === 0) {
      tableau.extensions.ui.closeDialog("invalid_payload");
      return;
    }

    setText("title", title);
    renderList(items);

    const d = formatDateFromVersion(version);
    setText("updatedAt", d ? `업데이트 일자: ${d}` : "");

    const dontBtn = document.getElementById("dontShowBtn");
    if (dontBtn) {
      dontBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Cloud/환경별 편차 대비: settings + localStorage 둘 다 저장
        tableau.extensions.settings.set(seenKey(dashboardName), version);
        await tableau.extensions.settings.saveAsync();
        localStorage.setItem(storageKey(dashboardName), version);

        tableau.extensions.ui.closeDialog("dont_show");
      };
    }
  } catch (e) {
    // dialog 내부에서도 사용자에게는 아무것도 안 보여주고 닫음
    try { tableau.extensions.ui.closeDialog("error"); } catch (_) {}
    console.error(e);
  }
})();
