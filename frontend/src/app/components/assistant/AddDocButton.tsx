"use client";

import { PlusIcon } from "lucide-react";

interface Props {
    onBrowseAll: () => void;
    selectedDocIds?: string[];
    hideLabel?: boolean;
}

export function AddDocButton({
    onBrowseAll,
    selectedDocIds = [],
    hideLabel = false,
}: Props) {
    return (
        <button
            type="button"
            onClick={onBrowseAll}
            className={`flex items-center gap-1 px-2 h-8 rounded-sm text-sm transition-colors cursor-pointer ${
                selectedDocIds.length > 0
                    ? "text-ink hover:text-ink"
                    : "text-ink-faint hover:text-ink"
            }`}
            title="Add documents"
            aria-label="Add documents"
        >
            {selectedDocIds.length > 0 ? (
                <span className="font-medium tabular-nums">
                    {selectedDocIds.length}
                </span>
            ) : (
                <PlusIcon className="h-4 w-4 shrink-0" />
            )}
            <span className={hideLabel ? "hidden" : "hidden sm:inline"}>
                {selectedDocIds.length === 1 ? "Document" : "Documents"}
            </span>
        </button>
    );
}
