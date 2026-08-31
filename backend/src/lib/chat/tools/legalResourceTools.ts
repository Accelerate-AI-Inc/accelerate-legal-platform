import type { SupabaseClient } from "@supabase/supabase-js";
import {
    isLegalResourceKind,
    LEGAL_RESOURCE_KINDS,
    type LegalResource,
} from "../../resources/legalAiResources";
import { listLegalResources } from "../../resources/legalResourceCatalog";

export const LEGAL_RESOURCE_TOOL_NAME = "legal_resource_lookup";

export type LegalResourceToolEvent = {
    type: "legal_resource_lookup";
    query: string | null;
    kind: string | null;
    jurisdiction: string | null;
    language: string | null;
    result_count: number;
    resources?: {
        slug: string;
        name: string;
        kind: string;
        category: string;
        paper_url: string | null;
        dataset_url: string | null;
        site_url: string | null;
    }[];
    error?: string;
};

/** Cap what one call can pull into the prompt. */
const MAX_RESULTS = 12;
const DEFAULT_RESULTS = 6;

export const LEGAL_RESOURCE_TOOLS = [
    {
        type: "function",
        function: {
            name: LEGAL_RESOURCE_TOOL_NAME,
            description:
                "Search the curated catalog of legal-AI research resources: training corpora, evaluation benchmarks (retrieval, question answering, entailment, classification, summarization, entity extraction), and legal research websites. Call this when the user asks which dataset, benchmark, corpus, or research source to use for a legal-AI task, or asks where to find case law or legislation for a jurisdiction. Returns names, descriptions and links; cite the links you use.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description:
                            "Free text matched against resource names, descriptions and task categories, e.g. 'case retrieval', 'privacy policy', 'contract clauses'.",
                    },
                    kind: {
                        type: "string",
                        enum: [...LEGAL_RESOURCE_KINDS],
                        description:
                            "Restrict to training corpora, evaluation benchmarks, or research websites.",
                    },
                    language: {
                        type: "string",
                        description:
                            "Resource language, e.g. 'English', 'Chinese', 'multilingual'.",
                    },
                    jurisdiction: {
                        type: "string",
                        description:
                            "Jurisdiction or country the resource covers, e.g. 'America', 'China', 'EU', 'multinational'.",
                    },
                    limit: {
                        type: "integer",
                        description: `Maximum results to return (default ${DEFAULT_RESULTS}, maximum ${MAX_RESULTS}).`,
                    },
                },
            },
        },
    },
];

function optionalString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** One line per resource — compact enough to sit in a prompt unabridged. */
function formatResource(resource: LegalResource): string {
    const links = [
        resource.paperUrl ? `paper: ${resource.paperUrl}` : null,
        resource.datasetUrl ? `dataset: ${resource.datasetUrl}` : null,
        resource.siteUrl ? `site: ${resource.siteUrl}` : null,
    ].filter(Boolean);
    const facets = [
        resource.languages.length > 0
            ? `language: ${resource.languages.join("/")}`
            : null,
        resource.jurisdictions.length > 0
            ? `jurisdiction: ${resource.jurisdictions.join("/")}`
            : null,
    ].filter(Boolean);

    return [
        `${resource.name} (${resource.kind}, ${resource.category})`,
        resource.description,
        facets.join("  "),
        links.join("  "),
    ]
        .filter(Boolean)
        .join("\n");
}

export interface LegalResourceLookupResult {
    /** Text handed back to the model as the tool result. */
    content: string;
    event: LegalResourceToolEvent;
}

/**
 * Search the resources catalog on the model's behalf.
 *
 * Reads through the same catalog layer the HTTP route uses, so an unseeded
 * database still answers from the bundled dataset rather than telling the model
 * there are no resources — a false negative here would have it invent one.
 */
export async function runLegalResourceLookup(
    db: SupabaseClient,
    args: Record<string, unknown>,
): Promise<LegalResourceLookupResult> {
    const query = optionalString(args.query);
    const rawKind = optionalString(args.kind);
    const kind = rawKind && isLegalResourceKind(rawKind) ? rawKind : null;
    const language = optionalString(args.language);
    const jurisdiction = optionalString(args.jurisdiction);
    const requestedLimit = Number.parseInt(String(args.limit ?? ""), 10);
    const limit = Number.isFinite(requestedLimit)
        ? Math.min(Math.max(requestedLimit, 1), MAX_RESULTS)
        : DEFAULT_RESULTS;

    const baseEvent = { query, kind: rawKind, jurisdiction, language } as const;

    if (rawKind && !kind) {
        return {
            content: `Unknown resource kind '${rawKind}'. Valid kinds: ${LEGAL_RESOURCE_KINDS.join(", ")}.`,
            event: {
                type: "legal_resource_lookup",
                ...baseEvent,
                result_count: 0,
                error: "unknown_kind",
            },
        };
    }

    try {
        const page = await listLegalResources(db, {
            limit,
            offset: 0,
            search: query,
            kind,
            language,
            jurisdiction,
        });

        if (page.resources.length === 0) {
            return {
                content:
                    "No matching resources in the catalog. Do not invent datasets — say that the catalog has no match and suggest broadening the search.",
                event: {
                    type: "legal_resource_lookup",
                    ...baseEvent,
                    result_count: 0,
                },
            };
        }

        const body = page.resources.map(formatResource).join("\n\n");
        return {
            content: `${page.resources.length} of ${page.total} matching resources:\n\n${body}`,
            event: {
                type: "legal_resource_lookup",
                ...baseEvent,
                result_count: page.resources.length,
                resources: page.resources.map((resource) => ({
                    slug: resource.slug,
                    name: resource.name,
                    kind: resource.kind,
                    category: resource.category,
                    paper_url: resource.paperUrl,
                    dataset_url: resource.datasetUrl,
                    site_url: resource.siteUrl,
                })),
            },
        };
    } catch (error) {
        return {
            content:
                "The resources catalog is unavailable. Tell the user you could not look it up rather than naming resources from memory.",
            event: {
                type: "legal_resource_lookup",
                ...baseEvent,
                result_count: 0,
                error: error instanceof Error ? error.message : String(error),
            },
        };
    }
}
