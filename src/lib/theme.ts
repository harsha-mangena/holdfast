export type Theme = "light" | "dark";
const KEY = "hf-theme";

export const THEME_BOOT = `(function(){try{var t=localStorage.getItem("hf-theme");if(t!=="light"&&t!=="dark")t="dark";var d=document.documentElement;d.dataset.theme=t;d.style.colorScheme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export function readTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* private mode */
  }
  return "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#f6f1ea" : "#12100e");
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
}

export function toggleTheme(): Theme {
  const next = readTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
