// dialog.js
const CONFIG_URL = "https://takyunhui.github.io/tableau_update_extension/updates.json";

function storageKey(dashboardName) {
  return `updatePopup_seenVersion_${dashboardName}`;
}

async function fetchJson(url) {
  const res = await fetch(`${url}?v=${Date.now()}`); // 캐시 방지
  if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
  return res.json();
}

function renderPopup(config) {
  const titleEl = document.getElementById("title");
  const versionEl = document.getElementById("version");
  const itemsEl = document.getElementById("items");

  titleEl.textContent = config.title || "업데이트 안내";

  if (config.version) {
    const datePart = config.version.split("-").slice(0, 3).join(".");
    versionEl.textContent = `업데이트 일자: ${datePart}`;
  } else {
    versionEl.textContent = "";
  }

  itemsEl.innerHTML = "";
  const items = Array.isArray(config.items) ? config.items : [];
  if (items.length === 0) {
    const li = document.createElement("li");
    li.textContent = "변경 사항이 등록되지 않았습니다.";
    itemsEl.appendChild(li);
  } else {
    for (const t of items) {
      const li = document.createElement("li");
      li.textContent = String(t);
      itemsEl.appendChild(li);
    }
  }
}

(async function main() {
  try {
    await tableau.extensions.initializeDialogAsync();

    // app.js에서 넘겨준 payload
    const payloadRaw = tableau.extensions.ui.dialogPayload;
    let payload = {};
    try { payload = JSON.parse(payloadRaw || "{}"); } catch (_) {}

    const dashboardName = (payload.dashboardName || "").trim();
    const versionFromHost = payload.version;

    // json에서 최신 config를 다시 가져와서 렌더링(운영 안정적)
    const data = await fetchJson(CONFIG_URL);
    const config = data?.dashboardsByName?.[dashboardName];

    // 안전장치: 혹시 config가 없으면 payload의 title이라도 표시
    const safeConfig = config || { title: payload.title || "업데이트 안내", version: versionFromHost, items: [] };

    renderPopup(safeConfig);

    const closeBtn = document.getElementById("closeBtn");
    const dontBtn = document.getElementById("dontShowBtn");

    // X 버튼 = 그냥 닫기(저장 X)
    closeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      tableau.extensions.ui.closeDialog("closed");
    };

    // 다시 보지 않기 = localStorage 저장 + 닫기
    dontBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const v = safeConfig.version || versionFromHost;
      if (dashboardName && v) {
        localStorage.setItem(storageKey(dashboardName), v);
      }
      tableau.extensions.ui.closeDialog("dont_show");
    };
  } catch (e) {
    console.error(e);
    // dialog에서는 화면에 에러 메시지라도 간단히 남김
    const itemsEl = document.getElementById("items");
    if (itemsEl) {
      itemsEl.innerHTML = "";
      const li = document.createElement("li");
      li.textContent = `오류: ${String(e?.message || e)}`;
      itemsEl.appendChild(li);
    }
  }
})();
