// dialog.js?v=9
// ✅ app.js에서 payload로 title/version/items/dashboardName을 넘겨주므로
// ✅ 여기서는 updates.json 재-fetch 하지 않음 (캐시/불일치/플리커 방지)

function seenKey(dashboardName) {
  return `seenVersion:${dashboardName}`;
}
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

(async function main() {
  try {
    await tableau.extensions.initializeDialogAsync();

    // payload 파싱
    let payload = {};
    try {
      payload = JSON.parse(tableau.extensions.ui.dialogPayload || "{}");
    } catch (e) {
      payload = { __parseError: String(e?.message || e) };
    }

    // 🔎 디버그 출력(원인 확인용)
    const dbg = document.getElementById("debugDialog");
    if (dbg) dbg.textContent = JSON.stringify(payload, null, 2);

    const dashboardName = (payload.dashboardName || "").trim();
    const version = payload.version || "";
    const title = payload.title || "업데이트 안내";
    const items = normalizeItems(payload.items);

    // title
    setText("title", title);

    // 최소 방어: payload가 비정상이면 화면에 원인 표시하고 종료(자동 닫기 X)
    if (!dashboardName) {
      setText("updatedAt", "오류: dashboardName 없음 (payload 전달 실패/캐시 가능)");
      renderList([`payload=${JSON.stringify(payload)}`]);
      return;
    }
    if (!version) {
      setText("updatedAt", "오류: version 없음 (payload 전달 실패/캐시 가능)");
      renderList([`payload=${JSON.stringify(payload)}`]);
      return;
    }
    if (items.length === 0) {
      setText("updatedAt", "오류: items 없음 (app.js가 items를 payload에 넣지 않았거나 캐시 가능)");
      renderList([`payload=${JSON.stringify(payload)}`]);
      return;
    }

    // items 렌더
    renderList(items);

    // 업데이트 일자 (내역 아래)
    const d = formatDateFromVersion(version);
    setText("updatedAt", d ? `업데이트 일자: ${d}` : "");

    // 다시 보지 않기
    const dontBtn = document.getElementById("dontShowBtn");
    if (dontBtn) {
      dontBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // ✅ Cloud/환경별 편차 대비: settings + localStorage 둘 다 저장
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
