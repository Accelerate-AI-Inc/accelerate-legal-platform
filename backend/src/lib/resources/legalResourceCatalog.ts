/**
 * Read side of the Legal AI resources catalog.
 *
 * Reads prefer the seeded `legal_ai_resources` table and fall back to the
 * bundled JSON when it is empty or unavailable — a fresh install has a working
 * Resources page and a working assistant tool before anyone runs
 * `npm run sync:resources`, and a database hiccup degrades to stale-but-correct
 * rather than to an error page.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
    bundledLegalResources,
    filterLegalResources,
    legalResourceFacets,
    type LegalResource,
    type LegalResourceQuery,
} from "./legalAiResources";

const SELECT_COLUMNS =
    "slug, name, kind, category, description, paper_url, dataset_url, site_url, languages, jurisdictions, tags, content_hash";

interface LegalResourceRow {
    slug: string;
    name: string;
    kind: string;
    category: string;
    description: string;
    paper_url: string | null;
    dataset_url: string | null;
    site_url: string | null;
    languages: string[] | null;
    jurisdictions: string[] | null;
    tags: string[] | null;
    content_hash: string;
}

function toResource(row: LegalResourceRow): LegalResource {
    return {
        slug: row.slug,
        name: row.name,
        kind: row.kind as LegalResource["kind"],
        category: row.category,
        description: row.description,
        paperUrl: row.paper_url,
        datasetUrl: row.dataset_url,
        siteUrl: row.site_url,
        languages: row.languages ?? [],
        jurisdictions: row.jurisdictions ?? [],
        tags: row.tags ?? [],
        contentHash: row.content_hash,
    };
}

export interface LegalResourcePage {
    resources: LegalResource[];
    total: number;
    /** True when the rows came from the bundled dataset, not the database. */
    bundled: boolean;
}

/**
 * One page of the catalog. Filtering and search happen in SQL when the table is
 * seeded, and against the bundled dataset otherwise; both paths apply the same
 * predicates so the two are interchangeable from the caller's point of view.
 */
export async function listLegalResources(
    db: SupabaseClient,
    query: LegalResourceQuery & { limit: number; offset: number },
): Promise<LegalResourcePage> {
    const { limit, offset, search, kind, category, language, jurisdiction } =
        query;

    let request = db
        .from("legal_ai_resources")
        .select(SELECT_COLUMNS, { count: "exact" })
        .eq("active", true);

    if (kind) request = request.eq("kind", kind);
    if (category) request = request.eq("category", category);
    if (language) request = request.contains("languages", [language]);
    if (jurisdiction) request = request.contains("jurisdictions", [jurisdiction]);
    if (search) {
        const pattern = `%${search}%`;
        request = request.or(
            `name.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern}`,
        );
    }

    const { data, error, count } = await request
        .order("name", { ascending: true })
        .range(offset, offset + limit - 1);

    if (!error && data && data.length > 0) {
        return {
            resources: (data as unknown as LegalResourceRow[]).map(toResource),
            total: count ?? data.length,
            bundled: false,
        };
    }

    // Either the table is unseeded or the query failed; serve the bundle. An
    // empty first page with a nonzero offset is a real end-of-results, not an
    // unseeded table, so only page 0 falls back.
    if (!error && offset > 0) {
        return { resources: [], total: count ?? 0, bundled: false };
    }

    const matched = filterLegalResources(bundledLegalResources(), query).sort(
        (a, b) => a.name.localeCompare(b.name),
    );
    return {
        resources: matched.slice(offset, offset + limit),
        total: matched.length,
        bundled: true,
    };
}

export async function getLegalResource(
    db: SupabaseClient,
    slug: string,
): Promise<LegalResource | null> {
    const { data, error } = await db
        .from("legal_ai_resources")
        .select(SELECT_COLUMNS)
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();

    if (!error && data) return toResource(data as unknown as LegalResourceRow);
    return (
        bundledLegalResources().find((resource) => resource.slug === slug) ?? null
    );
}

export async function getLegalResourceFacets(db: SupabaseClient): Promise<{
    kinds: string[];
    categories: string[];
    languages: string[];
    jurisdictions: string[];
}> {
    const { data, error } = await db
        .rpc("get_legal_resource_filter_options")
        .maybeSingle();

    if (!error && data) {
        const row = data as {
            kinds: string[] | null;
            categories: string[] | null;
            languages: string[] | null;
            jurisdictions: string[] | null;
        };
        if (row.kinds && row.kinds.length > 0) {
            return {
                kinds: row.kinds,
                categories: row.categories ?? [],
                languages: row.languages ?? [],
                jurisdictions: row.jurisdictions ?? [],
            };
        }
    }
    return legalResourceFacets(bundledLegalResources());
}
