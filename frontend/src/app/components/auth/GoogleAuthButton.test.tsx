import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleAuthButton } from "./GoogleAuthButton";

const { startGoogleOAuth, redeemAuthHandoff } = vi.hoisted(() => ({
    startGoogleOAuth: vi.fn(),
    redeemAuthHandoff: vi.fn(),
}));

vi.mock("@/app/lib/authApi", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/app/lib/authApi")>()),
    startGoogleOAuth,
    redeemAuthHandoff,
}));

describe("GoogleAuthButton", () => {
    beforeEach(() => {
        startGoogleOAuth.mockReset();
        redeemAuthHandoff.mockReset();
        delete window.accelerateDesktop;
    });

    it("starts Google OAuth with the shared auth callback", async () => {
        startGoogleOAuth.mockResolvedValue({ url: "https://accounts.example.test" });
        const onError = vi.fn();
        const user = userEvent.setup();
        render(<GoogleAuthButton onError={onError} />);

        await user.click(
            screen.getByRole("button", { name: "Continue with Google" }),
        );

        expect(startGoogleOAuth).toHaveBeenCalledWith("/onboarding/profile");
        expect(redeemAuthHandoff).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith("");
        expect(
            screen.getByRole("button", { name: "Continuing…" }),
        ).toBeDisabled();
    });

    it("surfaces provider startup errors and re-enables the button", async () => {
        startGoogleOAuth.mockRejectedValue(
            new Error("Google provider is unavailable"),
        );
        const onError = vi.fn();
        const user = userEvent.setup();
        render(<GoogleAuthButton onError={onError} />);

        await user.click(
            screen.getByRole("button", { name: "Continue with Google" }),
        );

        expect(onError).toHaveBeenLastCalledWith(
            "Google provider is unavailable",
        );
        expect(
            screen.getByRole("button", { name: "Continue with Google" }),
        ).toBeEnabled();
    });

    it("passes a caller-supplied destination to the OAuth start", async () => {
        startGoogleOAuth.mockResolvedValue({ url: "https://accounts.example.test" });
        const user = userEvent.setup();
        render(
            <GoogleAuthButton
                onError={vi.fn()}
                next="/auth/desktop?requestId=abcdefghijklmnop"
            />,
        );

        await user.click(
            screen.getByRole("button", { name: "Continue with Google" }),
        );

        expect(startGoogleOAuth).toHaveBeenCalledWith(
            "/auth/desktop?requestId=abcdefghijklmnop",
        );
    });

    describe("inside the desktop app", () => {
        function installBridge(
            signInWithGoogle: AccelerateDesktopBridge["signInWithGoogle"],
        ) {
            window.accelerateDesktop = {
                platform: "darwin",
                version: "0.1.0",
                signInWithGoogle,
            };
        }

        it("hands off to the system browser and redeems the ticket in-window", async () => {
            const signInWithGoogle = vi
                .fn()
                .mockResolvedValue({ ticket: "t".repeat(43), requestId: "r".repeat(43) });
            installBridge(signInWithGoogle);
            redeemAuthHandoff.mockResolvedValue({ user: { id: "u1" } });
            const onDesktopSignedIn = vi.fn();
            const onError = vi.fn();
            const user = userEvent.setup();
            render(
                <GoogleAuthButton
                    onError={onError}
                    next="/assistant"
                    onDesktopSignedIn={onDesktopSignedIn}
                />,
            );

            await user.click(
                screen.getByRole("button", { name: "Continue with Google" }),
            );

            expect(signInWithGoogle).toHaveBeenCalledTimes(1);
            expect(startGoogleOAuth).not.toHaveBeenCalled();
            expect(redeemAuthHandoff).toHaveBeenCalledWith(
                "t".repeat(43),
                "r".repeat(43),
            );
            expect(onDesktopSignedIn).toHaveBeenCalledWith("/assistant");
            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith("");
            expect(
                screen.getByRole("button", { name: "Continue with Google" }),
            ).toBeEnabled();
        });

        it("stays clickable while the browser holds the sign-in", async () => {
            let resolveSignIn: (value: {
                ticket: string;
                requestId: string;
            }) => void = () => {};
            installBridge(
                () =>
                    new Promise((resolve) => {
                        resolveSignIn = resolve;
                    }),
            );
            const onLoadingChange = vi.fn();
            const user = userEvent.setup();
            const { rerender } = render(
                <GoogleAuthButton
                    onError={vi.fn()}
                    onLoadingChange={onLoadingChange}
                />,
            );

            await user.click(
                screen.getByRole("button", { name: "Continue with Google" }),
            );
            expect(onLoadingChange).toHaveBeenLastCalledWith(true);

            // The parent mirrors our loading state back as `disabled`; the
            // waiting button must still let the user retry.
            rerender(
                <GoogleAuthButton
                    onError={vi.fn()}
                    onLoadingChange={onLoadingChange}
                    disabled
                />,
            );
            const waiting = screen.getByRole("button", {
                name: "Complete sign-in in your browser",
            });
            expect(waiting).toBeEnabled();
            expect(waiting).toHaveAttribute("aria-busy", "true");
            resolveSignIn({ ticket: "t".repeat(43), requestId: "r".repeat(43) });
        });

        it("ignores the outcome of a superseded attempt", async () => {
            const first: {
                resolve: (value: { ticket: string; requestId: string }) => void;
            } = { resolve: () => {} };
            const signInWithGoogle = vi
                .fn()
                .mockImplementationOnce(
                    () =>
                        new Promise((resolve) => {
                            first.resolve = resolve;
                        }),
                )
                .mockResolvedValueOnce({
                    ticket: "second".padEnd(43, "s"),
                    requestId: "r".repeat(43),
                });
            installBridge(signInWithGoogle);
            redeemAuthHandoff.mockResolvedValue({ user: { id: "u1" } });
            const onDesktopSignedIn = vi.fn();
            const user = userEvent.setup();
            render(
                <GoogleAuthButton
                    onError={vi.fn()}
                    onDesktopSignedIn={onDesktopSignedIn}
                />,
            );

            const button = screen.getByRole("button");
            await user.click(button);
            await user.click(button);
            first.resolve({ ticket: "first".padEnd(43, "f"), requestId: "r".repeat(43) });
            await vi.waitFor(() =>
                expect(onDesktopSignedIn).toHaveBeenCalledTimes(1),
            );

            expect(redeemAuthHandoff).toHaveBeenCalledTimes(1);
            expect(redeemAuthHandoff).toHaveBeenCalledWith(
                "second".padEnd(43, "s"),
                "r".repeat(43),
            );
        });

        it("reports an expired ticket in plain language", async () => {
            installBridge(async () => ({ ticket: "t".repeat(43), requestId: "r".repeat(43) }));
            const { AuthApiError } = await import("@/app/lib/authApi");
            redeemAuthHandoff.mockRejectedValue(
                new AuthApiError(400, "invalid_auth_handoff", "invalid"),
            );
            const onError = vi.fn();
            const user = userEvent.setup();
            render(<GoogleAuthButton onError={onError} />);

            await user.click(screen.getByRole("button"));

            expect(onError).toHaveBeenLastCalledWith(
                "This sign-in expired before it reached the app. Please try again.",
            );
            expect(screen.getByRole("button")).toBeEnabled();
        });

        it("surfaces bridge failures such as a timed-out browser sign-in", async () => {
            installBridge(() =>
                Promise.reject(new Error("Sign-in timed out. Please try again.")),
            );
            const onError = vi.fn();
            const user = userEvent.setup();
            render(<GoogleAuthButton onError={onError} />);

            await user.click(screen.getByRole("button"));

            expect(onError).toHaveBeenLastCalledWith(
                "Sign-in timed out. Please try again.",
            );
        });
    });
});
