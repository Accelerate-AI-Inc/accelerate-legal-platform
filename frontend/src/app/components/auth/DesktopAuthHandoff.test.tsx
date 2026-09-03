import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    DISABLED_MESSAGE,
    DesktopAuthHandoff,
    GENERIC_MESSAGE,
    INVALID_LINK_MESSAGE,
} from "./DesktopAuthHandoff";
import { AuthApiError } from "@/app/lib/authApi";

const state = vi.hoisted(() => ({
    search: "",
    auth: { isAuthenticated: false, authLoading: false },
    replace: vi.fn(),
    issueAuthHandoff: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ replace: state.replace }),
    useSearchParams: () => new URLSearchParams(state.search),
}));

vi.mock("@/app/contexts/AuthContext", () => ({
    useAuth: () => state.auth,
}));

vi.mock("@/app/lib/authApi", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/app/lib/authApi")>()),
    issueAuthHandoff: (...args: unknown[]) => state.issueAuthHandoff(...args),
}));

vi.mock("@/app/components/site-logo", () => ({
    SiteLogo: () => <div>Accelerate Legal</div>,
}));

const REQUEST_ID = "desktop-request-0123456789abcdef";
const originalLocation = window.location;

describe("DesktopAuthHandoff", () => {
    const assign = vi.fn();

    beforeEach(() => {
        state.search = `requestId=${REQUEST_ID}`;
        state.auth = { isAuthenticated: true, authLoading: false };
        state.replace.mockReset();
        state.issueAuthHandoff.mockReset();
        assign.mockReset();
        Object.defineProperty(window, "location", {
            configurable: true,
            value: { ...originalLocation, assign },
        });
    });

    afterEach(() => {
        Object.defineProperty(window, "location", {
            configurable: true,
            value: originalLocation,
        });
    });

    it("rejects a missing or malformed request id without calling the API", async () => {
        state.search = "requestId=nope";
        render(<DesktopAuthHandoff />);

        expect(await screen.findByText(INVALID_LINK_MESSAGE)).toBeInTheDocument();
        expect(state.issueAuthHandoff).not.toHaveBeenCalled();
        expect(state.replace).not.toHaveBeenCalled();
    });

    it("waits for the session check before deciding", () => {
        state.auth = { isAuthenticated: false, authLoading: true };
        render(<DesktopAuthHandoff />);

        expect(
            screen.getByText("Signing in the desktop app"),
        ).toBeInTheDocument();
        expect(state.replace).not.toHaveBeenCalled();
        expect(state.issueAuthHandoff).not.toHaveBeenCalled();
    });

    it("sends signed-out users to login and returns here afterwards", () => {
        state.auth = { isAuthenticated: false, authLoading: false };
        render(<DesktopAuthHandoff />);

        expect(state.replace).toHaveBeenCalledWith(
            `/login?next=${encodeURIComponent(`/auth/desktop?requestId=${REQUEST_ID}`)}`,
        );
        expect(state.issueAuthHandoff).not.toHaveBeenCalled();
    });

    it("mints a ticket and opens the deep link for signed-in users", async () => {
        state.issueAuthHandoff.mockResolvedValue({ ticket: "t".repeat(43) });
        render(<DesktopAuthHandoff />);

        const link = `accelerate-legal://auth?ticket=${"t".repeat(43)}`;
        await waitFor(() => expect(assign).toHaveBeenCalledWith(link));
        expect(state.issueAuthHandoff).toHaveBeenCalledWith(REQUEST_ID);
        expect(state.issueAuthHandoff).toHaveBeenCalledTimes(1);
        expect(
            screen.getByRole("link", { name: "Open Accelerate Legal" }),
        ).toHaveAttribute("href", link);
    });

    it("explains when the server has desktop sign-in disabled", async () => {
        state.issueAuthHandoff.mockRejectedValue(
            new AuthApiError(403, "auth_handoff_disabled", "disabled"),
        );
        render(<DesktopAuthHandoff />);

        expect(await screen.findByText(DISABLED_MESSAGE)).toBeInTheDocument();
        expect(assign).not.toHaveBeenCalled();
    });

    it("hides other failures behind a generic message", async () => {
        state.issueAuthHandoff.mockRejectedValue(
            new Error("relation auth_handoff_tickets does not exist"),
        );
        render(<DesktopAuthHandoff />);

        expect(await screen.findByText(GENERIC_MESSAGE)).toBeInTheDocument();
        expect(
            screen.queryByText(/auth_handoff_tickets/),
        ).not.toBeInTheDocument();
    });
});
