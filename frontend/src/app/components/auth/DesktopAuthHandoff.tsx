"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { SiteLogo } from "@/app/components/site-logo";
import { PillButton } from "@/app/components/ui/pill-button";
import { authGlassCardClassName } from "@/app/components/auth/authStyles";
import { useAuth } from "@/app/contexts/AuthContext";
import { AuthApiError, issueAuthHandoff } from "@/app/lib/authApi";
import { desktopAuthDeepLink, parseDesktopRequestId } from "@/app/lib/desktop";

/**
 * Browser-side half of desktop sign-in. The macOS app opens this page in the
 * user's default browser with the request id it generated. Once the user is
 * signed in here (email, Google, MFA — whatever the account needs), the page
 * mints a single-use handoff ticket and hands it back to the app over the
 * `accelerate-legal://` deep link. The app redeems it with its own request id.
 */

type PageState =
    | { status: "working" }
    | { status: "ready"; link: string }
    | { status: "error"; message: string };

export const INVALID_LINK_MESSAGE =
    "This sign-in link is invalid. Return to the Accelerate Legal app and try again.";
export const DISABLED_MESSAGE =
    "Desktop sign-in is not enabled on this server. Sign in with your email and password in the app, or ask your administrator to enable it.";
export const GENERIC_MESSAGE =
    "The desktop app could not be signed in. Return to the app and try again.";

function handoffErrorMessage(error: unknown): string {
    if (error instanceof AuthApiError && error.code === "auth_handoff_disabled") {
        return DISABLED_MESSAGE;
    }
    return GENERIC_MESSAGE;
}

export function DesktopAuthHandoff() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAuthenticated, authLoading } = useAuth();
    const requestId = parseDesktopRequestId(searchParams.get("requestId"));
    const [handoff, setHandoff] = useState<PageState>({ status: "working" });
    const issued = useRef(false);
    // A malformed link is known at render time; no effect needed.
    const state: PageState = requestId
        ? handoff
        : { status: "error", message: INVALID_LINK_MESSAGE };

    useEffect(() => {
        if (!requestId || authLoading) return;
        if (!isAuthenticated) {
            const here = `/auth/desktop?requestId=${encodeURIComponent(requestId)}`;
            router.replace(`/login?next=${encodeURIComponent(here)}`);
            return;
        }
        if (issued.current) return;
        issued.current = true;

        let cancelled = false;
        issueAuthHandoff(requestId)
            .then(({ ticket }) => {
                if (cancelled) return;
                const link = desktopAuthDeepLink(ticket);
                setHandoff({ status: "ready", link });
                window.location.assign(link);
            })
            .catch((error: unknown) => {
                if (cancelled) return;
                setHandoff({
                    status: "error",
                    message: handoffErrorMessage(error),
                });
            });
        return () => {
            cancelled = true;
        };
    }, [authLoading, isAuthenticated, requestId, router]);

    return (
        <div className="relative flex min-h-dvh items-center justify-center bg-paper/80 px-6 py-10">
            <div className="absolute top-4 md:top-8 left-1/2 -translate-x-1/2">
                <SiteLogo size="lg" asLink />
            </div>
            <div className="w-full max-w-md">
                <div className={authGlassCardClassName}>
                    {state.status === "error" ? (
                        <>
                            <h1 className="text-2xl font-medium font-serif text-ink">
                                Unable to sign in the desktop app
                            </h1>
                            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                                {state.message}
                            </p>
                            <PillButton
                                asChild
                                tone="ink"
                                size="normal"
                                className="mt-6"
                            >
                                <Link href="/login">Return to login</Link>
                            </PillButton>
                        </>
                    ) : state.status === "ready" ? (
                        <>
                            <h1 className="text-2xl font-medium font-serif text-ink">
                                You&apos;re signed in
                            </h1>
                            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                                Return to Accelerate Legal on your Mac to
                                continue. If the app did not open, use the
                                button below.
                            </p>
                            <PillButton
                                asChild
                                tone="ink"
                                size="normal"
                                className="mt-6"
                            >
                                <a href={state.link}>Open Accelerate Legal</a>
                            </PillButton>
                            <p className="mt-4 text-xs text-ink-muted">
                                You can close this tab.
                            </p>
                        </>
                    ) : (
                        <>
                            <Loader2 className="h-6 w-6 animate-spin text-ink-muted" />
                            <h1 className="mt-4 text-2xl font-medium font-serif text-ink">
                                Signing in the desktop app
                            </h1>
                            <p className="mt-2 text-sm text-ink-muted">
                                This should only take a moment.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
