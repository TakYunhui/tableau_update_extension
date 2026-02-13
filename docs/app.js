if (typeof tableau === "undefined") {
  const d = document.getElementById("debug");
  if (d) d.textContent = "tableau undefined (API script not loaded)";
  throw new Error("tableau is not defined");
}

const CONFIG_URL = "https://takyunhui.github.io/tableau_update_extension/updates.json";

function storageKey(dashboardName) {
  return `updatePopup_seenVersion_${dashboardName}`;
}

async function fetchJson(url) {
  const res = await fetch(`${url}?v=${Date.now()}`); // 캐시 방지
  if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
  return res.json();
}

(async function main() {
  try {
    await tableau.extensions.initializeAsync();

    const dashboard = tableau.extensions.dashboardContent.dashboard;
    const dashboardName = (dashboard.name || "").trim();

    // 상태바 표시
    const nameEl = document.getElementById("dashboardName");
    const bar = document.getElementById("statusBar");
    if (nameEl && bar) {
      nameEl.textContent = dashboardName || "(no name)";
      bar.classList.remove("hidden");
    }

    const data = await fetchJson(CONFIG_URL);
    const config = data?.dashboardsByName?.[dashboardName];

    // 업데이트 없으면 종료
    if (!config || !config.version) return;

    // 같은 버전 다시보지않기면 종료
    const seen = localStorage.getItem(storageKey(dashboardName));
    if (seen === config.version) return;

    showPopup(config, dashboardName);
  } catch (e) {
    console.error(e);
  }
})();

function showPopup(config, dashboardName) {
  const overlay = document.getElementById("overlay");
  const popup = document.getElementById("popup");
  const closeBtn = document.getElementById("closeBtn");

  const titleEl = document.getElementById("title");
  const versionEl = document.getElementById("version");
  const itemsEl = document.getElementById("items");

  if (!overlay || !popup || !closeBtn || !titleEl || !versionEl || !itemsEl) {
    console.error("Popup DOM elements missing");
    return;
  }

  titleEl.textContent = config.title || "업데이트 안내";
  versionEl.textContent = config.version ? `버전: ${config.version}` : "";

  // items 렌더
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

  // "다시 보지 않기" 버튼(없으면 생성)
  let dontBtn = document.getElementById("dontShowBtn");
  if (!dontBtn) {
    dontBtn = document.createElement("button");
    dontBtn.id = "dontShowBtn";
    dontBtn.type = "button";
    dontBtn.textContent = "다시 보지 않기";
    dontBtn.style.cssText =
      "margin-top:10px;padding:8px 10px;border:1px solid #ddd;background:#f7f7f7;border-radius:8px;cursor:pointer;font-size:13px;";
    popup.appendChild(dontBtn);
  }

  const hideOnly = () => {
    overlay.classList.add("hidden");
  };

  const hideAndSave = () => {
    if (config.version) {
      localStorage.setItem(storageKey(dashboardName), config.version);
    }
    overlay.classList.add("hidden");
  };

  // 이벤트 꼬임 방지: 기존 핸들러 제거(덮어쓰기)
  overlay.onclick = (e) => {
    // 오버레이 배경 클릭만 닫기
    if (e.target === overlay) hideOnly();
  };

  closeBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideOnly();
  };

  dontBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideAndSave();
  };

  // 팝업 내부 클릭은 overlay로 안 튀게
  popup.onclick = (e) => {
    e.stopPropagation();
  };

  overlay.classList.remove("hidden");
}
