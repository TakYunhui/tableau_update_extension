// ✅ Pages URL 고정 (정확히 이 파일을 fetch)
const CONFIG_URL = "https://takyunhui.github.io/tableau_update_extension/updates.json";

function setDebug(text) {
  const el = document.getElementById("debug");
  if (el) el.textContent = text;
}

function storageKey(dashboardId) {
  return `updatePopup_seenVersion_${dashboardId}`;
}

(async function main() {
  try {
    setDebug("Initializing...");
    await tableau.extensions.initializeAsync();

    const dashboard = tableau.extensions.dashboardContent.dashboard;
    const dashboardId = dashboard.id;

    setDebug(`Loaded. dashboardId=${dashboardId}`);

    const res = await fetch(`${CONFIG_URL}?v=${Date.now()}`); // 캐시 방지
    if (!res.ok) {
      setDebug(`Config fetch failed: ${res.status}`);
      return;
    }

    const data = await res.json();
    const config = data?.dashboards?.[dashboardId];

    if (!config) {
  setDebug(`No config for this dashboardId`);
  showPopup({ version: "TEST", title: "테스트", items: ["config 없어도 팝업 뜨면 연결 OK"] }, dashboardId);
  return;
}

    const seen = localStorage.getItem(storageKey(dashboardId));
    if (seen === config.version) {
      setDebug(`Seen version=${seen} (no popup)`);
      return;
    }

    showPopup(config, dashboardId);
  } catch (e) {
    setDebug(`Error: ${e?.message || e}`);
    // 콘솔도 남김
    console.error(e);
  }
})();

function showPopup(config, dashboardId) {
  const overlay = document.getElementById("overlay");
  const popup = document.getElementById("popup");
  const closeBtn = document.getElementById("closeBtn");

  const titleEl = document.getElementById("title");
  const versionEl = document.getElementById("version");
  const itemsEl = document.getElementById("items");
  const dontShow = document.getElementById("dontShow");

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

  // 표시
  overlay.classList.remove("hidden");

  const close = () => {
    if (dontShow.checked && config.version) {
      localStorage.setItem(storageKey(dashboardId), config.version);
    }
    overlay.classList.add("hidden");
  };

  // overlay 바깥 클릭 = 닫기
  overlay.addEventListener("click", close, { once: true });

  // 팝업 내부 클릭은 overlay로 전파 막기 (안 막으면 내용 눌러도 닫힘)
  popup.addEventListener("click", (e) => e.stopPropagation());

  // X 버튼
  closeBtn.addEventListener("click", close, { once: true });
}
