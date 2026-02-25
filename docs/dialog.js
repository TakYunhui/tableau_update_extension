// dialog.js
// ✅ app.js에서 payload로 items/title/version을 넘겨주므로
// ✅ 여기서는 updates.json 재-fetch / "없으면 닫기" 같은 판단 로직을 하지 않음(플리커 방지)

function storageKey(dashboardName) {
  return `updatePopup_seenVersion_${dashboardName}`;
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

function renderPopup({ title, version, items }) {
  const titleEl = document.getElementById("title");
  const itemsEl = document.getElementById("items");
  const updatedAtEl = document.getElementById("updatedAt");

  if (titleEl) titleEl.textContent = title || "업데이트 안내";

  // items 렌더
  if (itemsEl) {
    itemsEl.innerHTML = "";
    for (const t of items) {
      const li = document.createElement("li");
      li.textContent = t;
      itemsEl.appendChild(li);
    }
  }

  // 업데이트 일자(내역 아래)
  if (updatedAtEl) {
    const d = formatDateFromVersion(version);
    updatedAtEl.textContent = d ? `업데이트 일자: ${d}` : "";
  }
}

(async function main() {
  try {
    await tableau.extensions.initializeDialogAsync();

    // app.js에서 넘긴 payload 사용
    const payloadRaw = tableau.extensions.ui.dialogPayload;
    let payload = {};
    try {
      payload = JSON.parse(payloadRaw || "{}");
    } catch (_) {
      payload = {};
    }

    const dashboardName = (payload.dashboardName || "").trim();
    const version = payload.version || "";
    const title = payload.title || "업데이트 안내";
    const items = normalizeItems(payload.items);

    // ✅ 원칙상 app.js에서 안 열었어야 하지만,
    // 혹시 실수/구버전 혼재 대비해 최소 방어는 "조용히 닫기"
    if (!dashboardName || !version || items.length === 0) {
      tableau.extensions.ui.closeDialog("invalid_payload");
      return;
    }

    renderPopup({ title, version, items });

    const dontBtn = document.getElementById("dontShowBtn");
    if (dontBtn) {
      dontBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        localStorage.setItem(storageKey(dashboardName), version);
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
