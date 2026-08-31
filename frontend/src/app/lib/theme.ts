/**
 * The dark-mode preference lives on the user profile (server-persisted), which
 * means it is not known until the profile fetch resolves. To avoid a light
 * flash on first paint we mirror it into a cookie that the blocking bootstrap
 * script in `layout.tsx` reads before React hydrates. The cookie is a cache of
 * the profile field, never the source of truth.
 */
export const THEME_COOKIE_NAME = "accelerate-theme";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function applyDarkMode(enabled: boolean): void {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", enabled);
    document.documentElement.style.colorScheme = enabled ? "dark" : "light";
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${THEME_COOKIE_NAME}=${enabled ? "dark" : "light"}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
}
