import {
    File,
    FileSpreadsheet,
    FileText,
    Presentation,
} from "lucide-react";
import type { ComponentType } from "react";

export type FileTypeKind = "pdf" | "word" | "excel" | "ppt" | "other";

/**
 * Normalize a file_type value (e.g. "pdf") or a filename (e.g. "deck.pptx")
 * into a coarse kind used to pick an icon. Accepts both because some call
 * sites only have the filename (user-message files, citations) while others
 * carry the document's `file_type` field.
 */
export function fileTypeKind(value: string | null | undefined): FileTypeKind {
    const raw = (value ?? "").toLowerCase().trim();
    const ext = raw.includes(".") ? (raw.split(".").pop() ?? "") : raw;
    if (ext === "pdf") return "pdf";
    if (ext === "docx" || ext === "doc") return "word";
    if (ext === "xlsx" || ext === "xlsm" || ext === "xls") return "excel";
    if (ext === "pptx" || ext === "ppt") return "ppt";
    return "other";
}

/**
 * Line icons in one weight, drawn inline in `currentColor`.
 *
 * The previous set was four full-color gradient SVGs fetched through
 * `next/image` with a cache-busting query string. Each carried its own
 * lighting and vendor color, which fought every surface it sat on and could
 * not follow the theme. Type is now carried by the icon's silhouette and, where
 * the row has room, by the filename beside it.
 */
const ICONS: Record<FileTypeKind, ComponentType<{ className?: string }>> = {
    pdf: FileText,
    word: FileText,
    excel: FileSpreadsheet,
    ppt: Presentation,
    other: File,
};

export function FileTypeIcon({
    fileType,
    className = "h-3.5 w-3.5",
    muted = false,
}: {
    fileType: string | null | undefined;
    className?: string;
    /** Neutral placeholder for loading and disabled rows. */
    muted?: boolean;
}) {
    const Icon = ICONS[fileTypeKind(fileType)];
    return (
        <Icon
            className={`${className} shrink-0 ${
                muted ? "text-ink-faint/50" : "text-ink-faint"
            }`}
        />
    );
}
