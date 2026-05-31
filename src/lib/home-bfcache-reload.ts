/** Inline script: reload `/` when restored from bfcache (before React paints). */
export const HOME_BFCACHE_RELOAD_JS = `
(function () {
  var GUARD = "dotvault-home-history-reload";
  window.addEventListener("pageshow", function (event) {
    if (location.pathname !== "/") return;
    var nav = performance.getEntriesByType("navigation")[0];
    var back =
      event.persisted ||
      (nav && nav.type === "back_forward");
    if (!back) return;
    try {
      if (sessionStorage.getItem(GUARD) === "1") return;
      sessionStorage.setItem(GUARD, "1");
    } catch (e) {}
    location.reload();
  });
})();
`.trim();
