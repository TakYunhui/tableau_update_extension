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
    const dashboardName = dashboard.name;

    // (관리용) 대시보드 이름 표시바는 유지/삭제 선택
    const nameEl = document.getElementById("dashboardName");
    const bar = document.getElementById("statusBar");
    if (nameEl && bar) {
      nameEl.textContent = dashboardName || "(no name)";
      bar.classList.remove("hidden");
    }

    const data = await fetchJson(CONFIG_URL);
    const config = data?.dashboardsByName?.[dashboardName];

    // ✅ 업데이트 내역이 없으면 아무것도 안 함 (확장도 안 보이는 UX)
    if (!config || !config.version) return;

    const seen = localStorage.getItem(storageKey(dashboardName));
    if (seen === config.version) return; // 이미 본 버전이면 종료

    showPopup(config, dashboardName);
  } catch (e) {
    // 운영에선 조용히 실패하게 하고 싶으면 console만 남기고 return해도 됨
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

  titleEl.textContent = config.title || "업데이트 안내";
  versionEl.textContent = config.version ? `버전: ${config.version}` : "";

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

  overlay.classList.remove("hidden");

  const close = () => {
    // ✅ 닫는 순간 해당 버전 “확인 완료” 저장 (체크박스 없음)
    if (config.version) {
      localStorage.setItem(storageKey(dashboardName), config.version);
    }
    overlay.classList.add("hidden");
  };

  overlay.addEventListener("click", close, { once: true });
  popup.addEventListener("click", (e) => e.stopPropagation());
  closeBtn.addEventListener("click", close, { once: true });
}
