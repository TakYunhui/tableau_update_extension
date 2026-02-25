// dialog.js

function seenKey(dashboardName) {
  return `seenVersion:${dashboardName}`;
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

function renderPopup({ title, version, items }) {
  const titleEl = document.getElementById("title");
  const itemsEl = document.getElementById("items");
  const updatedAtEl = document.getElementById("updatedAt");

  if (titleEl) titleEl.textContent = title || "업데이트 안내";

  if (itemsEl) {
    itemsEl.innerHTML = "";
    for (const t of items) {
      const li = document.createElement("li");
      li.textContent = t;
      itemsEl.appendChild(li);
    }
  }

  if (updatedAtEl) {
    const d = formatDateFromVersion(version);
    updatedAtEl.textContent = d ? `업데이트 일자: ${d}` : "";
  }
}

(async function main() {
  try {
    await tableau.extensions.initializeDialogAsync();

    let payload = {};
    try {
      payload = JSON.parse(tableau.extensions.ui.dialogPayload || "{}");
    } catch (_) {
      payload = {};
    }

    const dashboardName = (payload.dashboardName || "").trim();
    const version = payload.version || "";
    const title = payload.title || "업데이트 안내";
    const items = normalizeItems(payload.items);

    // 최소 방어(원래 app.js에서 안 열었어야 함)
    if (!dashboardName || !version || items.length === 0) {
      tableau.extensions.ui.closeDialog("invalid_payload");
      return;
    }

    renderPopup({ title, version, items });

    const dontBtn = document.getElementById("dontShowBtn");
    if (dontBtn) {
      dontBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // ✅ settings 저장 + saveAsync 필수
        tableau.extensions.settings.set(seenKey(dashboardName), version);
        await tableau.extensions.settings.saveAsync();

        tableau.extensions.ui.closeDialog("dont_show");
      };
    }
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
