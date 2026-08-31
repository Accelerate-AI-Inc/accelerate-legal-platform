import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
    LEGAL_RESOURCE_TOOL_NAME,
    LEGAL_RESOURCE_TOOLS,
    runLegalResourceLookup,
} from "./legalResourceTools";

/**
 * A database that always reports an empty table, so the lookup falls through to
 * the bundled dataset — the same path a fresh install takes.
 */
function unseededDb(): SupabaseClient {
    const query: Record<string, unknown> = {};
    for (const method of ["select", "eq", "contains", "or", "order"]) {
        query[method] = vi.fn(() => query);
    }
    query.range = vi.fn(() =>
        Promise.resolve({ data: [], error: null, count: 0 }),
    );
    return { from: vi.fn(() => query) } as unknown as SupabaseClient;
}

function failingDb(): SupabaseClient {
    return {
        from: vi.fn(() => {
            throw new Error("catalog offline");
        }),
    } as unknown as SupabaseClient;
}

describe("legal resource lookup tool", () => {
    it("declares one tool the model can call", () => {
        expect(LEGAL_RESOURCE_TOOLS).toHaveLength(1);
        expect(LEGAL_RESOURCE_TOOLS[0]!.function.name).toBe(
            LEGAL_RESOURCE_TOOL_NAME,
        );
    });

    it("finds Chinese case-retrieval benchmarks by task and language", async () => {
        const result = await runLegalResourceLookup(unseededDb(), {
            query: "case retrieval",
            language: "Chinese",
        });

        expect(result.event.result_count).toBeGreaterThan(0);
        expect(result.content).toContain("LeCaRD");
        expect(result.content).toContain("dataset:");
    });

    it("caps the result count at the tool's ceiling", async () => {
        const result = await runLegalResourceLookup(unseededDb(), { limit: 500 });

        expect(result.event.result_count).toBeLessThanOrEqual(12);
    });

    it("defaults to a small page when no limit is given", async () => {
        const result = await runLegalResourceLookup(unseededDb(), {});

        expect(result.event.result_count).toBe(6);
    });

    it("rejects an unknown kind without searching", async () => {
        const result = await runLegalResourceLookup(unseededDb(), {
            kind: "treaty",
        });

        expect(result.event.error).toBe("unknown_kind");
        expect(result.content).toContain("Unknown resource kind");
    });

    // A false "no results" would invite the model to invent a dataset, so both
    // the empty and the failed case say so explicitly.
    it("tells the model not to invent resources when nothing matches", async () => {
        const result = await runLegalResourceLookup(unseededDb(), {
            query: "zzzzz-no-such-resource",
        });

        expect(result.event.result_count).toBe(0);
        expect(result.content).toContain("Do not invent datasets");
    });

    it("reports catalog failure rather than returning an empty result", async () => {
        const result = await runLegalResourceLookup(failingDb(), {
            query: "retrieval",
        });

        expect(result.event.error).toBe("catalog offline");
        expect(result.content).toContain("could not look it up");
    });
});
