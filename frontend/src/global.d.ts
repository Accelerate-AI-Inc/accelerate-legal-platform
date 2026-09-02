declare module "*.css";

/**
 * Bridge injected by the macOS desktop app's preload script
 * (desktop/electron/preload.cjs). Present only when the page is rendered
 * inside the desktop app; the browser build never sees it.
 */
interface AccelerateDesktopBridge {
    readonly platform: string;
    readonly version: string;
    /**
     * Opens the system browser on `/auth/desktop` and resolves once the user
     * has signed in there and the app has received the handoff ticket.
     */
    signInWithGoogle(): Promise<{ ticket: string; requestId: string }>;
}

interface Window {
    accelerateDesktop?: AccelerateDesktopBridge;
}
