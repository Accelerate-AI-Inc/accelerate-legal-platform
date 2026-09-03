import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ---------------------------------------------------------------------------
// Desktop sign-in handoff: the web origin mints a ticket for the current cookie
// session (POST /auth/handoff/issue) and the desktop app, rendering the same
// origin, redeems it (POST /auth/handoff). The ticket crypto and storage live
// in lib/authHandoff and are covered by their own unit tests; this suite pins
// the HTTP contract: origin gating, cookie-session requirement, configuration
// gating, and the request/response shapes both clients depend on.
// ---------------------------------------------------------------------------
const {
    issueAuthHandoff,
    consumeAuthHandoff,
    getSession,
    setSession,
    clearRequestAuthCookies,
} = vi.hoisted(() => ({
    issueAuthHandoff: vi.fn(),
    consumeAuthHandoff: vi.fn(),
    getSession: vi.fn(),
    setSession: vi.fn(),
    clearRequestAuthCookies: vi.fn(),
}));

vi.mock("../../lib/authHandoff", () => ({
    issueAuthHandoff: (...args: unknown[]) => issueAuthHandoff(...args),
    consumeAuthHandoff: (...args: unknown[]) => consumeAuthHandoff(...args),
}));

vi.mock("../../lib/authSession", () => ({
    createRequestSupabase: () => ({
        auth: { setSession: (...args: unknown[]) => setSession(...args) },
    }),
    clearRequestAuthCookies: (...args: unknown[]) =>
        clearRequestAuthCookies(...args),
    publicAuthUser: (user: { id: string; email?: string }) => ({
        id: user.id,
        email: user.email ?? "",
        pendingEmail: null,
        createdWithGoogle: false,
    }),
    authCookieName: () => "accelerate-session",
    legacyAuthCookieName: () => "mike-session",
    authCookiesAreSecure: () => false,
}));

// requireAuth authenticates any request carrying the session cookie. A bearer
// header marks the request as token-authenticated so the cookie-only guard
// on /handoff/issue can be exercised.
vi.mock("../../middleware/auth", () => ({
    requireAuth: (
        req: { headers: Record<string, string | undefined> },
        res: {
            locals: Record<string, unknown>;
            status: (code: number) => { json: (body: unknown) => void };
        },
        next: () => void,
    ) => {
        if (!req.headers.cookie?.includes("accelerate-session=")) {
            res.status(401).json({
                code: "unauthorized",
                detail: "Sign in required.",
            });
            return;
        }
        res.locals.userId = "u1";
        res.locals.authClient = {
            auth: { getSession: (...args: unknown[]) => getSession(...args) },
        };
        res.locals.authSource = req.headers.authorization ? "bearer" : "cookie";
        next();
    },
    requireMfaIfEnrolled: (_req: unknown, _res: unknown, next: () => void) =>
        next(),
}));

vi.mock("../../lib/supabase", () => ({
    createServerSupabase: vi.fn(() => ({})),
}));

import { app } from "../../app";

const ORIGIN = "http://localhost:3000";
const COOKIE = "accelerate-session=opaque-cookie-value";
const REQUEST_ID = "desktop-request-0123456789abcdef_ABC";
const TICKET = "ticket_".padEnd(48, "x");
const SESSION = {
    access_token: "at",
    refresh_token: "rt",
    user: { id: "u1", email: "lawyer@example.test" },
};

beforeEach(() => {
    issueAuthHandoff.mockReset();
    consumeAuthHandoff.mockReset();
    getSession.mockReset();
    setSession.mockReset();
    clearRequestAuthCookies.mockReset();
    process.env.AUTH_HANDOFF_ENCRYPTION_SECRET = "s".repeat(64);
});

describe("POST /auth/handoff/issue", () => {
    it("rejects requests from untrusted origins before authentication", async () => {
        const res = await request(app)
            .post("/auth/handoff/issue")
            .set("Origin", "https://evil.example")
            .set("Cookie", COOKIE)
            .send({ requestId: REQUEST_ID });

        expect(res.status).toBe(403);
        expect(res.body.code).toBe("untrusted_origin");
        expect(issueAuthHandoff).not.toHaveBeenCalled();
    });

    it("requires a signed-in session", async () => {
        const res = await request(app)
            .post("/auth/handoff/issue")
            .set("Origin", ORIGIN)
            .send({ requestId: REQUEST_ID });

        expect(res.status).toBe(401);
        expect(issueAuthHandoff).not.toHaveBeenCalled();
    });

    it("validates the request id shape", async () => {
        const res = await request(app)
            .post("/auth/handoff/issue")
            .set("Origin", ORIGIN)
            .set("Cookie", COOKIE)
            .send({ requestId: "too short" });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe("invalid_request");
        expect(issueAuthHandoff).not.toHaveBeenCalled();
    });

    it("reports desktop sign-in as disabled when the handoff secret is unset", async () => {
        delete process.env.AUTH_HANDOFF_ENCRYPTION_SECRET;

        const res = await request(app)
            .post("/auth/handoff/issue")
            .set("Origin", ORIGIN)
            .set("Cookie", COOKIE)
            .send({ requestId: REQUEST_ID });

        expect(res.status).toBe(403);
        expect(res.body).toEqual({
            code: "auth_handoff_disabled",
            detail: "Desktop sign-in is not enabled on this server.",
        });
        expect(issueAuthHandoff).not.toHaveBeenCalled();
    });

    it("refuses bearer-token sessions so tickets only ever move cookie sessions", async () => {
        const res = await request(app)
            .post("/auth/handoff/issue")
            .set("Origin", ORIGIN)
            .set("Cookie", COOKIE)
            .set("Authorization", "Bearer some-token")
            .send({ requestId: REQUEST_ID });

        expect(res.status).toBe(401);
        expect(res.body.code).toBe("cookie_session_required");
        expect(issueAuthHandoff).not.toHaveBeenCalled();
    });

    it("rejects when the cookie no longer resolves to a session", async () => {
        getSession.mockResolvedValue({ data: { session: null }, error: null });

        const res = await request(app)
            .post("/auth/handoff/issue")
            .set("Origin", ORIGIN)
            .set("Cookie", COOKIE)
            .send({ requestId: REQUEST_ID });

        expect(res.status).toBe(401);
        expect(res.body.code).toBe("cookie_session_required");
        expect(issueAuthHandoff).not.toHaveBeenCalled();
    });

    it("mints a ticket bound to the requesting origin and request id", async () => {
        getSession.mockResolvedValue({ data: { session: SESSION }, error: null });
        issueAuthHandoff.mockResolvedValue(TICKET);

        const res = await request(app)
            .post("/auth/handoff/issue")
            .set("Origin", ORIGIN)
            .set("Cookie", COOKIE)
            .send({ requestId: REQUEST_ID });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ticket: TICKET });
        expect(res.headers["cache-control"]).toBe("private, no-store");
        expect(issueAuthHandoff).toHaveBeenCalledWith({
            userId: "u1",
            requestId: REQUEST_ID,
            origin: ORIGIN,
            session: SESSION,
        });
    });

    it("hides storage failures behind a generic message", async () => {
        getSession.mockResolvedValue({ data: { session: SESSION }, error: null });
        issueAuthHandoff.mockRejectedValue(
            new Error("relation auth_handoff_tickets does not exist"),
        );
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});

        const res = await request(app)
            .post("/auth/handoff/issue")
            .set("Origin", ORIGIN)
            .set("Cookie", COOKIE)
            .send({ requestId: REQUEST_ID });

        expect(res.status).toBe(500);
        // The route supplies its own fallback and the global internal-error
        // guard may replace it; either way nothing internal leaks.
        expect(typeof res.body.detail).toBe("string");
        expect(JSON.stringify(res.body)).not.toContain("auth_handoff_tickets");
        consoleError.mockRestore();
    });
});

describe("POST /auth/handoff", () => {
    it("redeems a ticket from the web origin, not only the Word add-in", async () => {
        consumeAuthHandoff.mockResolvedValue({
            userId: "u1",
            accessToken: "at",
            refreshToken: "rt",
        });
        setSession.mockResolvedValue({
            data: { user: SESSION.user, session: SESSION },
            error: null,
        });

        const res = await request(app)
            .post("/auth/handoff")
            .set("Origin", ORIGIN)
            .send({ ticket: TICKET, requestId: REQUEST_ID });

        expect(res.status).toBe(200);
        expect(res.body.user).toEqual({
            id: "u1",
            email: "lawyer@example.test",
            pendingEmail: null,
            createdWithGoogle: false,
        });
        expect(consumeAuthHandoff).toHaveBeenCalledWith({
            ticket: TICKET,
            requestId: REQUEST_ID,
            origin: ORIGIN,
        });
        expect(setSession).toHaveBeenCalledWith({
            access_token: "at",
            refresh_token: "rt",
        });
    });

    it("still refuses untrusted origins", async () => {
        const res = await request(app)
            .post("/auth/handoff")
            .set("Origin", "https://evil.example")
            .send({ ticket: TICKET, requestId: REQUEST_ID });

        expect(res.status).toBe(403);
        expect(consumeAuthHandoff).not.toHaveBeenCalled();
    });

    it("reports an unknown, expired, or mismatched ticket as invalid", async () => {
        consumeAuthHandoff.mockResolvedValue(null);

        const res = await request(app)
            .post("/auth/handoff")
            .set("Origin", ORIGIN)
            .send({ ticket: TICKET, requestId: REQUEST_ID });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe("invalid_auth_handoff");
        expect(setSession).not.toHaveBeenCalled();
    });

    it("clears cookies when the redeemed session belongs to a different user", async () => {
        consumeAuthHandoff.mockResolvedValue({
            userId: "u1",
            accessToken: "at",
            refreshToken: "rt",
        });
        setSession.mockResolvedValue({
            data: { user: { id: "someone-else" }, session: SESSION },
            error: null,
        });
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});

        const res = await request(app)
            .post("/auth/handoff")
            .set("Origin", ORIGIN)
            .send({ ticket: TICKET, requestId: REQUEST_ID });

        expect(res.status).toBe(500);
        expect(clearRequestAuthCookies).toHaveBeenCalledTimes(1);
        consoleError.mockRestore();
    });
});
