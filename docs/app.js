// Extensions API 로드 확인
if (typeof tableau === "undefined") {
  const d = document.getElementById("debug");
  if (d) d.textContent = "tableau undefined (API script not loaded)";
  throw new Error("tableau is not defined");
}

// 업데이트 설정 JSON 위치
const CONFIG_URL = "https://takyunhui.github.io/tableau_update_extension/updates.json";

// 디버그 출력
function setDebug(text) {
  const el = document.getElementById("debug");
  if (el) el.textContent = text;
}

// 다시 보지 않기 저장 키 (dashboard.name 기준)
function storageKey(dashboardName) {
  return `updatePopup_seenVersion_${dashboardName}`;
}

(async function main() {
  try {
    setDebug("Initializing...");
    await tableau.extensions.initializeAsync();

    const dashboard = tableau.extensions.dashboardContent.dashboard;
    const dashboardName = dashboard.name;

    // 🔹 화면 상단에 대시보드 이름 표시 (관리용)
    const nameEl = document.getElementById("dashboardName");
    const bar = document.getElementById("statusBar");
    if (nameEl && bar) {
      nameEl.textContent = dashboardName || "(no name)";
      bar.classList.remove("hidden");
    }

    setDebug(`Loaded. dashboardName=${dashboardName}`);

    // 설정 JSON 로드 (캐시 방지)
    const res = await fetch(`${CONFIG_URL}?v=${Date.now()}`);
    if (!res.ok) {
      setDebug(`Config fetch failed: ${res.status}`);
      return;
    }

    const data = await res.json();
    const config = data?.dashboardsByName?.[dashboardName];

    // ❌ 이 대시보드에 업데이트 설정이 없으면 종료
    if (!config) {
      setDebug("No config for this dashboard");
      return;
    }

    // 다시 보지 않기 체크
    const seen = localStorage.getItem(storageKey(dashboardName));
    if (seen === config.version) {
      setDebug(`Seen version=${seen} (no popup)`);
      return;
    }

    // 팝업 표시
    showPopup(config, dashboardName);
  } catch (e) {
    setDebug(`Error: ${e?.message || e}`);
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
  const dontShow = document.getElementById("dontShow");

  titleEl.textContent = config.title || "업데이트 안내";
  versionEl.textContent = config.version ? `버전: ${config.version}` : "";

  // 변경 사항 목록 렌더
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

  // 팝업 표시
  overlay.classList.remove("hidden");

  const close = () => {
    if (dontShow.checked && config.version) {
      localStorage.setItem(storageKey(dashboardName), config.version);
    }
    overlay.classList.add("hidden");
  };

  // 바깥 클릭 시 닫기
  overlay.addEventListener("click", close, { once: true });

  // 팝업 내부 클릭은 전파 차단
  popup.addEventListener("click", (e) => e.stopPropagation());

  // X 버튼
  closeBtn.addEventListener("click", close, { once: true });
}
