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

// ✅ payload 읽기: dialogPayload 우선 -> 없으면 URL p64
function readPayload() {
  const raw = tableau.extensions.ui.dialogPayload;
  if (raw && String(raw).trim().length > 0) {
    try { return JSON.parse(raw); } catch (e) {
      return { __parseError: `dialogPayload parse error: ${String(e?.message || e)}`, __raw: raw };
    }
  }

  const qs = new URLSearchParams(window.location.search);
  const p64 = qs.get("p64");
  if (p64) {
    try { return JSON.parse(fromB64(p64)); } catch (e) {
      return { __parseError: `p64 parse error: ${String(e?.message || e)}`, __raw: p64 };
    }
  }

  return {};
}

(async function main() {
  try {
    await tableau.extensions.initializeDialogAsync();

    const payload = readPayload();

    // 디버그 표시
    const dbg = document.getElementById("debugDialog");
    if (dbg) dbg.textContent = JSON.stringify(payload, null, 2);

    const dashboardName = (payload.dashboardName || "").trim();
    const version = payload.version || "";
    const title = payload.title || "업데이트 안내";
    const items = normalizeItems(payload.items);

    setText("title", title);

    if (!dashboardName || !version || items.length === 0) {
      setText("updatedAt", "오류: payload 전달 실패 (debugDialog 확인)");
      renderList([`payload=${JSON.stringify(payload)}`]);
      return;
    }

    renderList(items);

    const d = formatDateFromVersion(version);
    setText("updatedAt", d ? `업데이트 일자: ${d}` : "");

    const dontBtn = document.getElementById("dontShowBtn");
    if (dontBtn) {
      dontBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        tableau.extensions.settings.set(seenKey(dashboardName), version);
        await tableau.extensions.settings.saveAsync();
        localStorage.setItem(storageKey(dashboardName), version);

        tableau.extensions.ui.closeDialog("dont_show");
      };
    }
  } catch (e) {
    console.error(e);
    setText("updatedAt", `오류: ${String(e?.message || e)}`);
  }
})();
