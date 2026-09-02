"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { GoogleIconUI } from "@/shared/ui/GoogleIconUI";
import { PillButton } from "@/app/components/ui/pill-button";
import {
    AuthApiError,
    redeemAuthHandoff,
    startGoogleOAuth,
} from "@/app/lib/authApi";
import { getDesktopBridge } from "@/app/lib/desktop";

interface GoogleAuthButtonProps {
    onError: (message: string) => void;
    disabled?: boolean;
    onLoadingChange?: (loading: boolean) => void;
    /**
     * Destination after sign-in. Defaults to onboarding, which forwards users
     * who already have a profile.
     */
    next?: string;
    /**
     * Desktop app only. Called once the browser-side sign-in has completed
     * and the handoff ticket has been redeemed in this window, so the caller
     * can refresh its session state and navigate to `next`.
     */
    onDesktopSignedIn?: (next: string) => void | Promise<void>;
}

const DEFAULT_NEXT = "/onboarding/profile";
const GENERIC_ERROR = "Unable to continue with Google";
const DESKTOP_GENERIC_ERROR =
    "Google sign-in could not be completed. Please try again.";

function desktopErrorMessage(error: unknown): string {
    if (error instanceof AuthApiError) {
        return error.status === 400
            ? "This sign-in expired before it reached the app. Please try again."
            : error.message;
    }
    if (error instanceof Error && error.message) return error.message;
    return DESKTOP_GENERIC_ERROR;
}

export function GoogleAuthButton({
    onError,
    disabled = false,
    onLoadingChange,
    next = DEFAULT_NEXT,
    onDesktopSignedIn,
}: GoogleAuthButtonProps) {
    const [loading, setLoading] = useState(false);
    const [waitingForBrowser, setWaitingForBrowser] = useState(false);
    // Each desktop attempt gets a sequence number so a superseded attempt
    // (the user clicked again before finishing in the browser) cannot report
    // its outcome over the newer one.
    const attemptRef = useRef(0);

    const setBusy = (busy: boolean) => {
        setLoading(busy);
        onLoadingChange?.(busy);
    };

    const handleDesktopAuth = async (bridge: AccelerateDesktopBridge) => {
        const attempt = ++attemptRef.current;
        setWaitingForBrowser(true);
        try {
            const { ticket, requestId } = await bridge.signInWithGoogle();
            if (attempt !== attemptRef.current) return;
            await redeemAuthHandoff(ticket, requestId);
            if (attempt !== attemptRef.current) return;
            await onDesktopSignedIn?.(next);
        } catch (error: unknown) {
            if (attempt !== attemptRef.current) return;
            onError(desktopErrorMessage(error));
        } finally {
            if (attempt === attemptRef.current) {
                setWaitingForBrowser(false);
                setBusy(false);
            }
        }
    };

    const handleGoogleAuth = async () => {
        setBusy(true);
        onError("");

        const bridge = getDesktopBridge();
        if (bridge) {
            await handleDesktopAuth(bridge);
            return;
        }

        try {
            const { url } = await startGoogleOAuth(next);
            window.location.assign(url);
        } catch (error: unknown) {
            onError(error instanceof Error ? error.message : GENERIC_ERROR);
            setBusy(false);
        }
    };

    let label = "Continue with Google";
    if (waitingForBrowser) label = "Complete sign-in in your browser";
    else if (loading) label = "Continuing…";

    return (
        <PillButton
            type="button"
            tone="paper"
            size="normal"
            className="w-full"
            // While the browser holds the sign-in, keep the button live so a
            // closed or lost browser tab can be recovered with another click.
            // The parent's `disabled` mirrors our own loading state through
            // onLoadingChange, so it is ignored for the same reason.
            disabled={!waitingForBrowser && (disabled || loading)}
            aria-busy={loading || undefined}
            onClick={() => void handleGoogleAuth()}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <GoogleIconUI className="h-4 w-4" />
            )}
            {label}
        </PillButton>
    );
}
