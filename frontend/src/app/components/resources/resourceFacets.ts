import type {
    LegalResourceKind,
    LegalResourceSummary,
} from "@/app/lib/accelerateApi";

/** The toolbar's tabs. `all` is a sentinel, not a kind. */
export type ResourceTab = "all" | LegalResourceKind;

export const RESOURCE_TABS: { id: ResourceTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "corpus", label: "Corpora" },
    { id: "benchmark", label: "Benchmarks" },
    { id: "website", label: "Sources" },
];

const KIND_LABELS: Record<LegalResourceKind, string> = {
    corpus: "Corpus",
    benchmark: "Benchmark",
    website: "Source",
};

export function resourceKindLabel(kind: LegalResourceKind): string {
    return KIND_LABELS[kind];
}

export function tabToKind(tab: ResourceTab): LegalResourceKind | null {
    return tab === "all" ? null : tab;
}

/**
 * The primary outbound link for a row.
 *
 * Datasets lead with where you can get the data, research sites with the site
 * itself, and a paper link is the fallback for an entry with neither.
 */
export function primaryResourceUrl(
    resource: LegalResourceSummary,
): string | null {
    return resource.dataset_url ?? resource.site_url ?? resource.paper_url;
}
