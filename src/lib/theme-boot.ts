/** Inline in `next/script` beforeInteractive — keep self-contained (no imports). */
export const THEME_BOOT_JS = `(function(){try{var k="dotvault-theme";var t=localStorage.getItem(k);var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
