// ✅ 여기를 네 GitHub Pages URL로 바꿔
const CONFIG_URL = "https://takyunhui.github.io/tableau_update_extension/updates.json";

(async function () {
  await tableau.extensions.initializeAsync();

  const dashboard = tableau.extensions.dashboardContent.dashboard;
  const dashboardId = dashboard.id;

  const res = await fetch(`${CONFIG_URL}?v=${Date.now()}`);
  const data = await res.json();

  const config = data.dashboards[dashboardId];
  if (!config) return;

  const storageKey = `seen_version_${dashboardId}`;
  const seenVersion = localStorage.getItem(storageKey);
  if (seenVersion === config.version) return;

  showPopup(config, storageKey);
})();

function showPopup(config, storageKey) {
  const overlay = document.getElementById("overlay");
  const img = document.getElementById("popupImage");
  const checkbox = document.getElementById("dontShow");

  img.src = config.image;
  overlay.classList.remove("hidden");

  // 아무 데나 클릭하면 닫힘
  overlay.addEventListener("click", () => {
    if (checkbox.checked) {
      localStorage.setItem(storageKey, config.version);
    }
    overlay.classList.add("hidden");
  }, { once: true });
}
