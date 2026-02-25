// dialog.js?v=12

function seenKey(dashboardName) {
  return `seenVersion:${dashboardName}`;
}
function storageKey(dashboardName) {
  return `updatePopup_seenVersion_${dashboardName}`;
}

function fromB64(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

// 26.02.25 형태
function formatYYMMDDFromVersion(version) {
  if (!version) return "";
  const parts = String(version).split("-").slice(0, 3); // YYYY, MM, DD
  if (parts.length !== 3) return "";
  const yy = parts[0].slice(-2);
  const mm = parts[1];
  const dd = parts[2];
  return `${yy}.${mm}.${dd}`;
}

// 하단 문구용은 "YYYY.MM.DD" 유지해도 되고, 동일 포맷으로 맞춰도 됨
function formatDateFromVersion(version) {
  const s = formatYYMMDDFromVersion(version);
  return s; // 지금은 헤더와 통일
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

function readPayload() {
  const raw = tableau.extensions.ui.dialogPayload;
  if (raw && String(raw).trim().length > 0) {
    try { return JSON.parse(raw); } catch {}
  }

  const qs = new URLSearchParams(window.location.search);
  const p64 = qs.get("p64");
  if (p64) {
    try { return JSON.parse(fromB64(p64)); } catch {}
  }
  return {};
}

(async function main() {
  try {
    await tableau.extensions.initializeDialogAsync();

    const payload = readPayload();

    const dashboardName = (payload.dashboardName || "").trim();
    const version = payload.version || "";
    const items = normalizeItems(payload.items);

    // payload가 비정상이면 조용히 닫기
    if (!dashboardName || !version || items.length === 0) {
      tableau.extensions.ui.closeDialog("invalid_payload");
      return;
    }

    // ✅ 제목은 고정: dialog.html에 "업데이트 내역" 고정 텍스트 사용
    // setText("title", ...) 필요 없음

    // ✅ 헤더 옆 일자: (일자: 26.02.25)
    const headerDate = formatYYMMDDFromVersion(version);
    setText("headerDate", headerDate ? `(일자: ${headerDate})` : "");

    // items 렌더
    renderList(items);

    // 하단 일자(원하면 삭제 가능)
    const d = formatDateFromVersion(version);
    setText("updatedAt", d ? `업데이트 일자: ${d}` : "");

    // 다시 보지 않기
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
    try { tableau.extensions.ui.closeDialog("error"); } catch (_) {}
    console.error(e);
  }
})();
