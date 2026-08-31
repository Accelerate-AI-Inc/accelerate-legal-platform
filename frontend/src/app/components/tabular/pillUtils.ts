import type { ColumnConfig } from "../shared/types";

export type PillSegment =
    | { type: "text"; content: string }
    | { type: "pill"; content: string };

/** Sequential colors assigned to tags by their position in the tags array.
    Drawn from the categorical token scale so tags stay distinguishable in both
    themes without reaching for a raw palette hue. */
export const TAG_COLORS = [
    "bg-cat-1-wash text-cat-1",
    "bg-cat-2-wash text-cat-2",
    "bg-cat-3-wash text-cat-3",
    "bg-cat-4-wash text-cat-4",
    "bg-cat-5-wash text-cat-5",
    "bg-cat-6-wash text-cat-6",
    "bg-cat-7-wash text-cat-7",
    "bg-cat-8-wash text-cat-8",
];

const CURRENCY_COLORS: Record<string, string> = {
    USD: "bg-cat-3-wash text-cat-3",
    EUR: "bg-cat-2-wash text-cat-2",
    GBP: "bg-cat-5-wash text-cat-5",
    JPY: "bg-cat-1-wash text-cat-1",
    CHF: "bg-cat-4-wash text-cat-4",
    AUD: "bg-cat-6-wash text-cat-6",
    CAD: "bg-cat-8-wash text-cat-8",
    SGD: "bg-cat-7-wash text-cat-7",
    HKD: "bg-cat-1-wash text-cat-1",
    NZD: "bg-cat-3-wash text-cat-3",
    CNY: "bg-cat-4-wash text-cat-4",
};

export function getPillClass(content: string, column?: ColumnConfig): string {
    if (column?.format === "yes_no") {
        const lower = content.toLowerCase();
        if (lower === "yes") return "bg-positive-wash text-positive";
        if (lower === "no") return "bg-critical-wash text-critical";
        return "bg-surface-sunk text-ink";
    }
    if (column?.format === "currency") {
        return (
            CURRENCY_COLORS[content.toUpperCase()] ??
            "bg-surface-sunk text-ink-muted"
        );
    }
    if (column?.format === "tag" && column.tags?.length) {
        const idx = column.tags.findIndex(
            (t) => t.toLowerCase() === content.toLowerCase(),
        );
        if (idx >= 0) return TAG_COLORS[idx % TAG_COLORS.length]!;
    }
    return "bg-surface-sunk text-ink";
}

/** Split text on [[...]] pill markers, preserving surrounding text. */
export function parsePills(text: string): PillSegment[] {
    const segments: PillSegment[] = [];
    const regex = /\[\[([^\]]+)\]\]/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
        }
        segments.push({ type: "pill", content: match[1] });
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
        segments.push({ type: "text", content: text.slice(lastIndex) });
    }
    return segments;
}
