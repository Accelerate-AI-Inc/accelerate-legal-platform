import { afterEach, describe, expect, it, vi } from "vitest";
import {
    desktopAuthDeepLink,
    getDesktopBridge,
    isDesktopApp,
    parseDesktopRequestId,
} from "./desktop";

describe("desktop bridge detection", () => {
    afterEach(() => {
        delete window.accelerateDesktop;
    });

    it("reports a plain browser when no bridge is injected", () => {
        expect(getDesktopBridge()).toBeNull();
        expect(isDesktopApp()).toBe(false);
    });

    it("reports no bridge during server rendering", () => {
        vi.stubGlobal("window", undefined);
        try {
            expect(getDesktopBridge()).toBeNull();
            expect(isDesktopApp()).toBe(false);
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it("ignores a malformed bridge object", () => {
        window.accelerateDesktop = {
            platform: "darwin",
            version: "0.1.0",
        } as unknown as AccelerateDesktopBridge;
        expect(getDesktopBridge()).toBeNull();
    });

    it("returns the bridge when the preload exposed it", () => {
        const bridge: AccelerateDesktopBridge = {
            platform: "darwin",
            version: "0.1.0",
            signInWithGoogle: async () => ({ ticket: "t", requestId: "r" }),
        };
        window.accelerateDesktop = bridge;
        expect(getDesktopBridge()).toBe(bridge);
        expect(isDesktopApp()).toBe(true);
    });
});

describe("desktop auth helpers", () => {
    it("accepts request ids in the backend's accepted shape", () => {
        const id = "a".repeat(43);
        expect(parseDesktopRequestId(id)).toBe(id);
        expect(parseDesktopRequestId("Ab-_" + "x".repeat(12))).toBe(
            "Ab-_" + "x".repeat(12),
        );
    });

    it("rejects missing, short, long, or unsafe request ids", () => {
        expect(parseDesktopRequestId(null)).toBeNull();
        expect(parseDesktopRequestId(undefined)).toBeNull();
        expect(parseDesktopRequestId("short")).toBeNull();
        expect(parseDesktopRequestId("x".repeat(129))).toBeNull();
        expect(parseDesktopRequestId("has space" + "x".repeat(16))).toBeNull();
        expect(parseDesktopRequestId("<script>" + "x".repeat(16))).toBeNull();
    });

    it("builds the deep link with the ticket URL-encoded", () => {
        expect(desktopAuthDeepLink("abc_DEF-123")).toBe(
            "accelerate-legal://auth?ticket=abc_DEF-123",
        );
        expect(desktopAuthDeepLink("a b")).toBe(
            "accelerate-legal://auth?ticket=a+b",
        );
    });
});
