import { describe, expect, it } from "vitest";
import {
    bundledLegalResources,
    filterLegalResources,
    isLegalResourceKind,
    LEGAL_RESOURCE_ATTRIBUTION,
    legalResourceFacets,
    legalResourceSitesForJurisdiction,
} from "../legalAiResources";

describe("bundled legal AI resources", () => {
    const resources = bundledLegalResources();

    it("carries the upstream attribution the licence requires", () => {
        expect(LEGAL_RESOURCE_ATTRIBUTION.source).toBe(
            "https://github.com/CSHaitao/Awesome-LegalAI-Resources",
        );
        expect(LEGAL_RESOURCE_ATTRIBUTION.license).toBe("MIT");
    });

    it("holds every upstream entry with a unique slug", () => {
        expect(resources.length).toBeGreaterThan(60);
        expect(new Set(resources.map((r) => r.slug)).size).toBe(resources.length);
    });

    it("gives every entry a description, a kind and a content hash", () => {
        for (const resource of resources) {
            expect(resource.description).not.toBe("");
            expect(isLegalResourceKind(resource.kind)).toBe(true);
            expect(resource.contentHash).toMatch(/^[0-9a-f]{64}$/);
        }
    });

    // COLIEE is listed twice upstream, under Retrieval and under Entailment,
    // with different task descriptions. Both must survive the import.
    it("keeps both COLIEE entries apart by category", () => {
        const coliee = resources.filter((r) => r.name === "COLIEE");
        expect(coliee).toHaveLength(2);
        expect(new Set(coliee.map((r) => r.category)).size).toBe(2);
    });

    it("classifies corpora, benchmarks and websites", () => {
        const kinds = new Set(resources.map((r) => r.kind));
        expect(kinds).toEqual(new Set(["corpus", "benchmark", "website"]));
    });

    it("gives every website a link and no dataset link", () => {
        for (const site of resources.filter((r) => r.kind === "website")) {
            expect(site.siteUrl).toMatch(/^https?:\/\//);
            expect(site.datasetUrl).toBeNull();
        }
    });
});

describe("filterLegalResources", () => {
    const resources = bundledLegalResources();

    it("matches free text against name, description and category", () => {
        const matched = filterLegalResources(resources, { search: "retrieval" });
        expect(matched.length).toBeGreaterThan(0);
        expect(
            matched.every((resource) =>
                [resource.name, resource.description, resource.category]
                    .join(" ")
                    .toLowerCase()
                    .includes("retrieval"),
            ),
        ).toBe(true);
    });

    it("narrows by kind, language and jurisdiction together", () => {
        const matched = filterLegalResources(resources, {
            kind: "benchmark",
            language: "Chinese",
            jurisdiction: "China",
        });
        expect(matched.length).toBeGreaterThan(0);
        for (const resource of matched) {
            expect(resource.kind).toBe("benchmark");
            expect(resource.languages).toContain("Chinese");
            expect(resource.jurisdictions).toContain("China");
        }
    });

    it("matches facet values case-insensitively", () => {
        expect(
            filterLegalResources(resources, { language: "chinese" }).length,
        ).toBe(filterLegalResources(resources, { language: "Chinese" }).length);
    });

    it("returns everything for an empty query", () => {
        expect(filterLegalResources(resources, {})).toHaveLength(
            resources.length,
        );
    });
});

describe("legalResourceFacets", () => {
    it("returns sorted distinct values for each facet", () => {
        const facets = legalResourceFacets(bundledLegalResources());
        expect(facets.kinds).toEqual(["benchmark", "corpus", "website"]);
        expect(facets.categories).toContain("General Corpus");
        expect(facets.languages).toContain("English");
        expect(facets.jurisdictions).toContain("America");
        for (const values of Object.values(facets)) {
            expect(values).toEqual([...values].sort((a, b) => a.localeCompare(b)));
            expect(new Set(values).size).toBe(values.length);
        }
    });
});

describe("legalResourceSitesForJurisdiction", () => {
    it("returns only websites", () => {
        const sites = legalResourceSitesForJurisdiction("America");
        expect(sites.length).toBeGreaterThan(0);
        expect(sites.every((site) => site.kind === "website")).toBe(true);
    });

    it("includes multinational sites for any jurisdiction", () => {
        const names = legalResourceSitesForJurisdiction("China").map(
            (site) => site.name,
        );
        expect(names).toContain("worldlii.org");
    });

    it("excludes sites scoped to a different jurisdiction", () => {
        const names = legalResourceSitesForJurisdiction("China").map(
            (site) => site.name,
        );
        expect(names).not.toContain("pacer.gov");
    });

    it("returns nothing for a blank jurisdiction", () => {
        expect(legalResourceSitesForJurisdiction("  ")).toEqual([]);
    });
});
