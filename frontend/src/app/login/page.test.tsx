import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

const { login, startGoogleOAuth, refreshSession, replace, push, navigation } =
    vi.hoisted(() => ({
        login: vi.fn(),
        startGoogleOAuth: vi.fn(),
        refreshSession: vi.fn(),
        replace: vi.fn(),
        push: vi.fn(),
        navigation: { search: "" },
    }));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ replace, push }),
    useSearchParams: () => new URLSearchParams(navigation.search),
}));

vi.mock("@/app/lib/authApi", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/app/lib/authApi")>()),
    login,
    startGoogleOAuth,
}));

vi.mock("@/app/contexts/AuthContext", () => ({
    useAuth: () => ({
        isAuthenticated: false,
        authLoading: false,
        refreshSession,
    }),
}));

vi.mock("@/app/components/site-logo", () => ({
    SiteLogo: () => <div>Accelerate Legal</div>,
}));

describe("LoginPage", () => {
    beforeEach(() => {
        login.mockReset();
        startGoogleOAuth.mockReset();
        refreshSession.mockReset();
        refreshSession.mockResolvedValue(null);
        replace.mockReset();
        push.mockReset();
        navigation.search = "";
    });

    it("returns to an allow-listed next destination after logging in", async () => {
        navigation.search = "next=%2Fauth%2Fdesktop%3FrequestId%3Dabcdefghijklmnop";
        login.mockResolvedValue({ user: { id: "user-1" } });
        startGoogleOAuth.mockResolvedValue({ url: "https://accounts.example.test" });
        const user = userEvent.setup();
        render(<LoginPage />);

        await user.type(
            screen.getByRole("textbox", { name: "Email" }),
            "existing@example.com",
        );
        await user.type(screen.getByLabelText("Password"), "oldpass");
        await user.click(screen.getByRole("button", { name: "Log in" }));

        expect(push).toHaveBeenCalledWith(
            "/auth/desktop?requestId=abcdefghijklmnop",
        );

        await user.click(
            screen.getByRole("button", { name: "Continue with Google" }),
        );
        expect(startGoogleOAuth).toHaveBeenCalledWith(
            "/auth/desktop?requestId=abcdefghijklmnop",
        );
    });

    it("ignores an unknown next destination", async () => {
        navigation.search = "next=https%3A%2F%2Fevil.example";
        login.mockResolvedValue({ user: { id: "user-1" } });
        const user = userEvent.setup();
        render(<LoginPage />);

        await user.type(
            screen.getByRole("textbox", { name: "Email" }),
            "existing@example.com",
        );
        await user.type(screen.getByLabelText("Password"), "oldpass");
        await user.click(screen.getByRole("button", { name: "Log in" }));

        expect(push).toHaveBeenCalledWith("/onboarding/profile");
    });

    it("allows an existing account to submit a password shorter than the new minimum", async () => {
        login.mockResolvedValue({ user: { id: "user-1" } });
        const user = userEvent.setup();
        render(<LoginPage />);

        expect(screen.getByLabelText("Password")).not.toHaveAttribute(
            "placeholder",
        );

        await user.type(
            screen.getByRole("textbox", { name: "Email" }),
            "existing@example.com",
        );
        await user.type(screen.getByLabelText("Password"), "oldpass");
        await user.click(screen.getByRole("button", { name: "Log in" }));

        expect(login).toHaveBeenCalledWith("existing@example.com", "oldpass");
        expect(push).toHaveBeenCalledWith("/onboarding/profile");
    });

    it("places Google login after the primary login action", () => {
        render(<LoginPage />);

        const login = screen.getByRole("button", { name: "Log in" });
        const google = screen.getByRole("button", {
            name: "Continue with Google",
        });
        expect(
            login.compareDocumentPosition(google) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });
});
