/**
 * The Legal AI resources catalog.
 *
 * Two things read this module: the seed job that loads the catalog into
 * Postgres, and every runtime reader (the HTTP route, the assistant's lookup
 * tool) as a fallback for when the table has not been seeded yet. That means a
 * fresh install shows a populated Resources page before anyone runs
 * `npm run sync:resources`.
 *
 * The JSON is generated — see ATTRIBUTION.md and
 * scripts/import-legal-ai-resources.mjs. Do not hand-edit it.
 */
import catalog from "./legalAiResources.json";

export type LegalResourceKind = "corpus" | "benchmark" | "website";

export interface LegalResource {
    /** Stable identifier; category-qualified where a name repeats upstream. */
    slug: string;
    name: string;
    kind: LegalResourceKind;
    /** Upstream section, e.g. "General Corpus", "Question Answering". */
    category: string;
    description: string;
    paperUrl: string | null;
    datasetUrl: string | null;
    siteUrl: string | null;
    languages: string[];
    jurisdictions: string[];
    tags: string[];
    /** sha256 over the semantic fields; the catalog replace is keyed on it. */
    contentHash: string;
}

export interface LegalResourceCatalog {
    source: string;
    license: string;
    generatedBy: string;
    resources: LegalResource[];
}

const CATALOG = catalog as LegalResourceCatalog;

export const LEGAL_RESOURCE_KINDS: readonly LegalResourceKind[] = [
    "corpus",
    "benchmark",
    "website",
];

export function isLegalResourceKind(
    value: unknown,
): value is LegalResourceKind {
    return (
        typeof value === "string" &&
        (LEGAL_RESOURCE_KINDS as readonly string[]).includes(value)
    );
}

/** Attribution shown on the Resources page. Required by the upstream licence. */
export const LEGAL_RESOURCE_ATTRIBUTION = {
    source: CATALOG.source,
    license: CATALOG.license,
} as const;

export function bundledLegalResources(): LegalResource[] {
    return CATALOG.resources;
}

export interface LegalResourceQuery {
    /** Free text matched against name, description and category. */
    search?: string | null;
    kind?: LegalResourceKind | null;
    category?: string | null;
    language?: string | null;
    jurisdiction?: string | null;
}

function matchesTerm(values: string[], term: string): boolean {
    const lower = term.toLowerCase();
    return values.some((value) => value.toLowerCase() === lower);
}

/**
 * Filter the bundled catalog. The database path applies the same predicates in
 * SQL; this exists so the route and the assistant tool behave identically when
 * the table is unavailable.
 */
export function filterLegalResources(
    resources: LegalResource[],
    query: LegalResourceQuery,
): LegalResource[] {
    const search = query.search?.trim().toLowerCase() ?? "";
    return resources.filter((resource) => {
        if (query.kind && resource.kind !== query.kind) return false;
        if (query.category && resource.category !== query.category) return false;
        if (query.language && !matchesTerm(resource.languages, query.language)) {
            return false;
        }
        if (
            query.jurisdiction &&
            !matchesTerm(resource.jurisdictions, query.jurisdiction)
        ) {
            return false;
        }
        if (!search) return true;
        return (
            resource.name.toLowerCase().includes(search) ||
            resource.description.toLowerCase().includes(search) ||
            resource.category.toLowerCase().includes(search)
        );
    });
}

/** Distinct facet values, for the filter controls and the assistant's tool. */
export function legalResourceFacets(resources: LegalResource[]): {
    kinds: string[];
    categories: string[];
    languages: string[];
    jurisdictions: string[];
} {
    const collect = (pick: (resource: LegalResource) => string[]) =>
        [...new Set(resources.flatMap(pick))].sort((a, b) => a.localeCompare(b));

    return {
        kinds: collect((resource) => [resource.kind]),
        categories: collect((resource) => [resource.category]),
        languages: collect((resource) => resource.languages),
        jurisdictions: collect((resource) => resource.jurisdictions),
    };
}

/**
 * Websites covering a jurisdiction, for the research surface's
 * "other sources" group. `multinational` sites match every jurisdiction, since
 * that is exactly what they claim to cover.
 */
export function legalResourceSitesForJurisdiction(
    jurisdiction: string,
    resources: LegalResource[] = bundledLegalResources(),
): LegalResource[] {
    const wanted = jurisdiction.trim().toLowerCase();
    if (!wanted) return [];
    return resources.filter(
        (resource) =>
            resource.kind === "website" &&
            resource.jurisdictions.some((value) => {
                const lower = value.toLowerCase();
                return lower === wanted || lower === "multinational";
            }),
    );
}
