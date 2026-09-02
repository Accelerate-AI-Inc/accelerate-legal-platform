/**
 * Detection and typed access for the macOS desktop app bridge. The desktop
 * shell renders the hosted web app and exposes `window.accelerateDesktop`
 * from its preload script; everything here degrades to "not desktop" in a
 * plain browser so callers can branch without feature-sniffing themselves.
 */

export function getDesktopBridge(): AccelerateDesktopBridge | null {
    if (typeof window === "undefined") return null;
    const bridge = window.accelerateDesktop;
    if (!bridge || typeof bridge.signInWithGoogle !== "function") return null;
    return bridge;
}

export function isDesktopApp(): boolean {
    return getDesktopBridge() !== null;
}

export const DESKTOP_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

/** Validate a `requestId` arriving on `/auth/desktop` from the query string. */
export function parseDesktopRequestId(
    candidate: string | null | undefined,
): string | null {
    if (!candidate || !DESKTOP_REQUEST_ID_PATTERN.test(candidate)) return null;
    return candidate;
}

export const DESKTOP_AUTH_SCHEME = "accelerate-legal";

/** Deep link that returns a minted ticket to the desktop app. */
export function desktopAuthDeepLink(ticket: string): string {
    const url = new URL(`${DESKTOP_AUTH_SCHEME}://auth`);
    url.searchParams.set("ticket", ticket);
    return url.toString();
}
