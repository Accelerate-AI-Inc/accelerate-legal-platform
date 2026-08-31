"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Landmark } from "lucide-react";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { TableToolbar } from "@/app/components/shared/TableToolbar";
import {
    SkeletonLine,
    TableBody,
    TableCell,
    TableEmptyState,
    TableHeaderCell,
    TableHeaderRow,
    TableRow,
    TableScrollArea,
} from "@/app/components/shared/TablePrimitive";
import { EmptyState } from "@/app/components/ui/empty-state";
import {
    getLegalResourceFilterOptions,
    listLegalResources,
    type LegalResourceFilterOptions,
    type LegalResourceSummary,
} from "@/app/lib/accelerateApi";
import { userFacingApiError } from "@/app/lib/userFacingError";
import bundledCatalog from "./legalAiResources.json";
import { ResourceDetailPanel } from "./ResourceDetailPanel";
import {
    primaryResourceUrl,
    resourceKindLabel,
    RESOURCE_TABS,
    tabToKind,
    type ResourceTab,
} from "./resourceFacets";
import { ResourceFacetFilter } from "./ResourceFacetFilter";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 200;

const NAME_COL = "w-[240px] shrink-0 md:w-[300px]";
const KIND_COL = "w-[120px] shrink-0";
const META_COL = "w-[150px] shrink-0";

/**
 * The bundled dataset: first paint, and the fallback when the API is
 * unreachable. Generated into both apps by
 * `scripts/import-legal-ai-resources.mjs` from the same source the backend
 * seeds from, so a fresh install shows a populated catalog before
 * `npm run sync:resources` has run. Do not hand-edit the JSON.
 */
const BUNDLED: LegalResourceSummary[] = (
    bundledCatalog.resources as {
        slug: string;
        name: string;
        kind: string;
        category: string;
        description: string;
        paperUrl: string | null;
        datasetUrl: string | null;
        siteUrl: string | null;
        languages: string[];
        jurisdictions: string[];
        tags: string[];
    }[]
).map((resource) => ({
    slug: resource.slug,
    name: resource.name,
    kind: resource.kind as LegalResourceSummary["kind"],
    category: resource.category,
    description: resource.description,
    paper_url: resource.paperUrl,
    dataset_url: resource.datasetUrl,
    site_url: resource.siteUrl,
    languages: resource.languages,
    jurisdictions: resource.jurisdictions,
    tags: resource.tags,
}));

const BUNDLED_ATTRIBUTION = {
    source: bundledCatalog.source,
    license: bundledCatalog.license,
};

function facetsFrom(resources: LegalResourceSummary[]): LegalResourceFilterOptions {
    const unique = (values: string[]) =>
        [...new Set(values)].sort((a, b) => a.localeCompare(b));
    return {
        kinds: unique(resources.map((resource) => resource.kind)),
        categories: unique(resources.map((resource) => resource.category)),
        languages: unique(resources.flatMap((resource) => resource.languages)),
        jurisdictions: unique(
            resources.flatMap((resource) => resource.jurisdictions),
        ),
    };
}

function filterBundled(
    resources: LegalResourceSummary[],
    query: {
        search: string;
        kind: string | null;
        language: string | null;
        jurisdiction: string | null;
    },
): LegalResourceSummary[] {
    const search = query.search.trim().toLowerCase();
    return resources.filter((resource) => {
        if (query.kind && resource.kind !== query.kind) return false;
        if (query.language && !resource.languages.includes(query.language)) {
            return false;
        }
        if (
            query.jurisdiction &&
            !resource.jurisdictions.includes(query.jurisdiction)
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

export function ResourcesView() {
    const [tab, setTab] = useState<ResourceTab>("all");
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [language, setLanguage] = useState<string | null>(null);
    const [jurisdiction, setJurisdiction] = useState<string | null>(null);

    const [resources, setResources] = useState<LegalResourceSummary[] | null>(
        null,
    );
    const [facets, setFacets] = useState<LegalResourceFilterOptions>(() =>
        facetsFrom(BUNDLED),
    );
    const [attribution, setAttribution] = useState(BUNDLED_ATTRIBUTION);
    const [offline, setOffline] = useState(false);
    const [unseeded, setUnseeded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

    // Debounce the search box so typing does not issue a request per keystroke.
    useEffect(() => {
        const timer = window.setTimeout(
            () => setSearch(searchInput),
            SEARCH_DEBOUNCE_MS,
        );
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    const requestId = useRef(0);

    const load = useCallback(async () => {
        const id = ++requestId.current;
        const kind = tabToKind(tab);
        try {
            const page = await listLegalResources({
                search: search || null,
                kind,
                language,
                jurisdiction,
                limit: PAGE_SIZE,
                offset: 0,
            });
            if (id !== requestId.current) return;
            setResources(page.resources);
            setAttribution(page.attribution);
            setUnseeded(page.bundled);
            setOffline(false);
            setError(null);
        } catch (caught) {
            if (id !== requestId.current) return;
            // The catalog is static reference data, so falling back to the
            // bundled copy is strictly better than an error page.
            setResources(
                filterBundled(BUNDLED, { search, kind, language, jurisdiction }),
            );
            setAttribution(BUNDLED_ATTRIBUTION);
            setOffline(true);
            setUnseeded(false);
            setError(
                userFacingApiError(caught, "The catalog could not be refreshed."),
            );
        }
    }, [tab, search, language, jurisdiction]);

    useEffect(() => {
        // Deferred by a microtask so the state writes inside `load` never
        // happen synchronously during the effect, which would cascade a render.
        let cancelled = false;
        void Promise.resolve().then(() => {
            if (!cancelled) void load();
        });
        return () => {
            cancelled = true;
        };
    }, [load]);

    useEffect(() => {
        let cancelled = false;
        void getLegalResourceFilterOptions()
            .then((options) => {
                if (!cancelled) setFacets(options);
            })
            .catch(() => {
                // Bundled facets are already in state.
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const selected = useMemo(
        () =>
            resources?.find((resource) => resource.slug === selectedSlug) ?? null,
        [resources, selectedSlug],
    );

    const hasActiveFilters =
        Boolean(search) || Boolean(language) || Boolean(jurisdiction);

    return (
        <div className="flex h-full min-h-0 w-full flex-col">
            <PageHeader
                eyebrow="Knowledge"
                title="Resources"
                actions={[
                    {
                        type: "search",
                        value: searchInput,
                        onChange: setSearchInput,
                        placeholder: "Search resources",
                    },
                ]}
            />

            <TableToolbar
                items={RESOURCE_TABS}
                active={tab}
                onChange={(next) => {
                    setTab(next);
                    setSelectedSlug(null);
                }}
                actions={
                    <div className="flex items-center gap-2">
                        <ResourceFacetFilter
                            label="Language"
                            value={language}
                            options={facets.languages}
                            onChange={setLanguage}
                        />
                        <ResourceFacetFilter
                            label="Jurisdiction"
                            value={jurisdiction}
                            options={facets.jurisdictions}
                            onChange={setJurisdiction}
                        />
                    </div>
                }
            />

            {(offline || unseeded) && (
                <p
                    role="status"
                    className="mx-4 mb-2 text-xs text-ink-faint md:mx-8"
                >
                    {offline
                        ? "Showing the bundled catalog — the resources service is unavailable."
                        : "Showing the bundled catalog — run the resources sync to load it into the database."}
                    {error ? ` ${error}` : ""}
                </p>
            )}

            <div className="flex min-h-0 flex-1 flex-col gap-2 md:flex-row md:gap-3">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <TableScrollArea
                        header={
                            <TableHeaderRow>
                                <TableHeaderCell className={`pl-4 ${NAME_COL}`}>
                                    Name
                                </TableHeaderCell>
                                <TableHeaderCell className={KIND_COL}>
                                    Type
                                </TableHeaderCell>
                                <TableHeaderCell className={META_COL}>
                                    Category
                                </TableHeaderCell>
                                <TableHeaderCell className={META_COL}>
                                    Language
                                </TableHeaderCell>
                                <TableHeaderCell className={META_COL}>
                                    Jurisdiction
                                </TableHeaderCell>
                            </TableHeaderRow>
                        }
                    >
                        <TableBody>
                            {resources === null ? (
                                Array.from({ length: 8 }, (_, index) => (
                                    <TableRow key={index} interactive={false}>
                                        <div className={`pl-4 ${NAME_COL}`}>
                                            <SkeletonLine className="w-2/3" />
                                        </div>
                                        <div className={KIND_COL}>
                                            <SkeletonLine className="w-1/2" />
                                        </div>
                                        <div className={META_COL}>
                                            <SkeletonLine className="w-2/3" />
                                        </div>
                                        <div className={META_COL}>
                                            <SkeletonLine className="w-1/2" />
                                        </div>
                                        <div className={META_COL}>
                                            <SkeletonLine className="w-1/2" />
                                        </div>
                                    </TableRow>
                                ))
                            ) : resources.length === 0 ? (
                                <TableEmptyState>
                                    <EmptyState
                                        icon={<Landmark />}
                                        title="No matching resources"
                                        description={
                                            hasActiveFilters
                                                ? "Try a broader search or clear the filters."
                                                : "The catalog is empty."
                                        }
                                    />
                                </TableEmptyState>
                            ) : (
                                resources.map((resource) => {
                                    const href = primaryResourceUrl(resource);
                                    return (
                                        <TableRow
                                            key={resource.slug}
                                            selected={
                                                resource.slug === selectedSlug
                                            }
                                            onClick={() =>
                                                setSelectedSlug((current) =>
                                                    current === resource.slug
                                                        ? null
                                                        : resource.slug,
                                                )
                                            }
                                        >
                                            <div
                                                className={`min-w-0 pl-4 ${NAME_COL}`}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <span className="truncate text-sm text-ink">
                                                        {resource.name}
                                                    </span>
                                                    {href && (
                                                        <ExternalLink
                                                            aria-hidden="true"
                                                            className="h-3 w-3 shrink-0 text-ink-faint"
                                                        />
                                                    )}
                                                </div>
                                                <p className="truncate text-xs text-ink-faint">
                                                    {resource.description}
                                                </p>
                                            </div>
                                            <TableCell className={KIND_COL}>
                                                <span className="text-eyebrow text-ink-faint">
                                                    {resourceKindLabel(
                                                        resource.kind,
                                                    )}
                                                </span>
                                            </TableCell>
                                            <TableCell className={META_COL}>
                                                {resource.category}
                                            </TableCell>
                                            <TableCell className={META_COL}>
                                                {resource.languages.join(", ") ||
                                                    "—"}
                                            </TableCell>
                                            <TableCell className={META_COL}>
                                                {resource.jurisdictions.join(
                                                    ", ",
                                                ) || "—"}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </TableScrollArea>

                    <p className="mx-4 mb-3 text-xs text-ink-faint md:mx-8">
                        Curated from{" "}
                        <a
                            href={attribution.source}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-accent underline decoration-rule-strong underline-offset-2 hover:text-accent-hover"
                        >
                            Awesome-LegalAI-Resources
                        </a>{" "}
                        ({attribution.license}).
                    </p>
                </div>

                {selected && (
                    <div className="min-h-0 shrink-0 pr-0 pb-2 md:pr-8 md:pb-3">
                        <ResourceDetailPanel
                            resource={selected}
                            onClose={() => setSelectedSlug(null)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
