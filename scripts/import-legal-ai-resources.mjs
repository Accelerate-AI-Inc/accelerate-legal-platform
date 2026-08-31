#!/usr/bin/env node
/**
 * Build the Legal AI resources catalog from the upstream awesome-list.
 *
 * Source: https://github.com/CSHaitao/Awesome-LegalAI-Resources (MIT).
 * The upstream README is a bullet list with a stable shape:
 *
 *   - **Name**: description sentence(s).
 *       [Paper](url) [Link](url)
 *
 *       **Language**: English  **Country**: America
 *
 * plus a Websites section of bare `- <url> description` lines. This script
 * parses that into the normalized records the app consumes and writes them to
 * backend/src/lib/resources/legalAiResources.json.
 *
 * Deterministic: same input, byte-identical output — so the committed JSON can
 * be regenerated and diffed when upstream changes. Run:
 *
 *   node scripts/import-legal-ai-resources.mjs            # fetch upstream
 *   node scripts/import-legal-ai-resources.mjs README.md  # from a local copy
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const UPSTREAM_README =
    "https://raw.githubusercontent.com/CSHaitao/Awesome-LegalAI-Resources/main/README.md";
const HERE = path.dirname(fileURLToPath(import.meta.url));
/**
 * The dataset is written to both apps rather than shared across the repo
 * boundary: the backend seeds and serves from it, and the frontend bundles it
 * as the Resources page's first paint and offline fallback. A runtime import
 * reaching out of `frontend/` does not survive the Next build, and two
 * generated copies from one script cannot drift.
 */
const OUTPUTS = [
    path.join(HERE, "..", "backend", "src", "lib", "resources", "legalAiResources.json"),
    path.join(
        HERE,
        "..",
        "frontend",
        "src",
        "app",
        "components",
        "resources",
        "legalAiResources.json",
    ),
];

/** Sections whose entries are research corpora rather than benchmarks. */
const CORPUS_SECTIONS = new Set(["General Corpus"]);

/**
 * Jurisdiction tags for the Websites section, derived from each site's
 * coverage. The upstream list gives no structured field for these, and the
 * research surface needs them to offer jurisdiction-matched sources.
 */
const SITE_JURISDICTIONS = [
    [/flk\.npc\.gov\.cn|wenshu\.court\.gov\.cn/, ["China"]],
    [/westlaw|lexisnexis|heinonline/, ["multinational"]],
    [/case\.law|scdb\.wustl\.edu|uscode\.house\.gov|uspto\.gov|justia|findlaw|courtlistener|pacer\.gov|law\.cornell\.edu/, ["America"]],
    [/legifrance/, ["France"]],
    [/statmt\.org\/europarl|curia\.europa\.eu/, ["EU"]],
    [/bailii/, ["UK", "Ireland"]],
    [/austlii/, ["Australia"]],
    [/canlii/, ["Canada"]],
    [/worldlii/, ["multinational"]],
];

/** Split a slash- or comma-separated metadata value into trimmed parts. */
function splitList(value) {
    if (!value) return [];
    return value
        .split(/[/,]/)
        .map((part) => part.trim())
        .filter((part) => part && part.toLowerCase() !== "unknown");
}

function slugify(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function contentHash(record) {
    // Hash the semantic fields only, so a re-run with unchanged upstream text
    // produces an unchanged hash and the seed job stays a no-op.
    const { slug, name, kind, category, description, paperUrl, datasetUrl,
        siteUrl, languages, jurisdictions } = record;
    return createHash("sha256")
        .update(JSON.stringify([slug, name, kind, category, description,
            paperUrl, datasetUrl, siteUrl, languages, jurisdictions]))
        .digest("hex");
}

/**
 * Parse the dataset sections. Entries begin at a `- **Name**:` line and run
 * until the next entry or heading, so links and metadata on continuation lines
 * belong to the entry above them.
 */
function parseDatasetEntries(markdown) {
    const lines = markdown.split("\n");
    const entries = [];
    let section = null;
    let subsection = null;
    let current = null;

    const flush = () => {
        if (current) entries.push(current);
        current = null;
    };

    for (const line of lines) {
        const h2 = /^##\s+(.*?)\s*$/.exec(line);
        if (h2) {
            flush();
            section = h2[1];
            subsection = null;
            continue;
        }
        const h3 = /^###\s+(.*?)\s*$/.exec(line);
        if (h3) {
            flush();
            subsection = h3[1];
            continue;
        }
        if (!section || section === "Websites" || section === "About") {
            if (section === "Websites") flush();
            continue;
        }

        const start = /^-\s+\*\*(.+?)\*\*:?\s*(.*)$/.exec(line);
        if (start) {
            flush();
            current = {
                name: start[1].trim(),
                category: subsection ?? section,
                section,
                descriptionParts: start[2] ? [start[2].trim()] : [],
                paperUrl: null,
                datasetUrl: null,
                languages: [],
                jurisdictions: [],
            };
            continue;
        }
        if (!current) continue;

        const meta = /\*\*Language\*\*:\s*(.*?)\s*\*\*Country\*\*:\s*(.*?)\s*$/.exec(line);
        if (meta) {
            current.languages = splitList(meta[1]);
            current.jurisdictions = splitList(meta[2]);
            continue;
        }

        const paper = /\[Paper\]\((.*?)\)/.exec(line);
        if (paper) current.paperUrl = paper[1];
        const link = /\[Link\]\((.*?)\)/.exec(line);
        if (link) current.datasetUrl = link[1];
        if (paper || link) continue;

        const text = line.trim();
        if (text) current.descriptionParts.push(text);
    }
    flush();
    return entries;
}

/** Parse the Websites section's `- <url> description` lines. */
function parseWebsiteEntries(markdown) {
    const section = markdown.split(/^##\s+Websites\s*$/m)[1];
    if (!section) return [];
    const body = section.split(/^##\s+/m)[0];
    const entries = [];
    for (const line of body.split("\n")) {
        const match = /^-\s+(https?:\/\/\S+?)\/?:?\s+(.*)$/.exec(line.trim());
        if (!match) continue;
        const [, rawUrl, description] = match;
        const url = rawUrl.replace(/:$/, "");
        const host = new URL(url).hostname.replace(/^www\./, "");
        const jurisdictions =
            SITE_JURISDICTIONS.find(([pattern]) => pattern.test(url))?.[1] ?? [];
        entries.push({
            name: host,
            category: "Websites",
            description: description.trim().replace(/\s+/g, " "),
            siteUrl: url,
            jurisdictions,
        });
    }
    return entries;
}

function buildRecords(markdown) {
    const records = [];

    for (const entry of parseDatasetEntries(markdown)) {
        const kind = CORPUS_SECTIONS.has(entry.section) ? "corpus" : "benchmark";
        // COLIEE appears under two benchmark subsections with different task
        // descriptions, so the slug is category-qualified to keep both.
        const base = slugify(entry.name);
        const slug =
            records.some((existing) => existing.slug === base) ||
            entry.name.toUpperCase() === "COLIEE"
                ? `${base}-${slugify(entry.category)}`
                : base;
        const record = {
            slug,
            name: entry.name,
            kind,
            category: entry.category,
            description: entry.descriptionParts.join(" ").replace(/\s+/g, " ").trim(),
            paperUrl: entry.paperUrl,
            datasetUrl: entry.datasetUrl,
            siteUrl: null,
            languages: entry.languages,
            jurisdictions: entry.jurisdictions,
            tags: [kind, ...entry.languages, ...entry.jurisdictions].map(slugify),
        };
        records.push({ ...record, contentHash: contentHash(record) });
    }

    for (const entry of parseWebsiteEntries(markdown)) {
        const record = {
            slug: slugify(entry.name),
            name: entry.name,
            kind: "website",
            category: entry.category,
            description: entry.description,
            paperUrl: null,
            datasetUrl: null,
            siteUrl: entry.siteUrl,
            languages: [],
            jurisdictions: entry.jurisdictions,
            tags: ["website", ...entry.jurisdictions].map(slugify),
        };
        records.push({ ...record, contentHash: contentHash(record) });
    }

    return records.sort((a, b) => a.slug.localeCompare(b.slug));
}

async function readSource(argument) {
    if (argument) return readFile(argument, "utf8");
    const response = await fetch(UPSTREAM_README);
    if (!response.ok) {
        throw new Error(
            `Could not fetch the upstream README (HTTP ${response.status}).`,
        );
    }
    return response.text();
}

async function main() {
    const markdown = await readSource(process.argv[2]);
    const resources = buildRecords(markdown);

    const duplicates = resources
        .map((record) => record.slug)
        .filter((slug, index, all) => all.indexOf(slug) !== index);
    if (duplicates.length > 0) {
        throw new Error(`Duplicate slugs: ${[...new Set(duplicates)].join(", ")}`);
    }
    const missing = resources.filter((record) => !record.description);
    if (missing.length > 0) {
        throw new Error(
            `Entries with no description: ${missing.map((r) => r.slug).join(", ")}`,
        );
    }

    const payload = {
        source: "https://github.com/CSHaitao/Awesome-LegalAI-Resources",
        license: "MIT",
        generatedBy: "scripts/import-legal-ai-resources.mjs",
        resources,
    };
    const serialized = `${JSON.stringify(payload, null, 2)}\n`;
    for (const output of OUTPUTS) {
        await writeFile(output, serialized, "utf8");
    }

    const counts = resources.reduce((acc, record) => {
        acc[record.kind] = (acc[record.kind] ?? 0) + 1;
        return acc;
    }, {});
    console.log(
        `Wrote ${resources.length} resources to ${OUTPUTS.map((output) =>
            path.relative(process.cwd(), output),
        ).join(" and ")}`,
        counts,
    );
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
