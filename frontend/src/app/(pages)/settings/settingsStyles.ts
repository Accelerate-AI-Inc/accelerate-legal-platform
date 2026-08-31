import { cn } from "@/app/lib/utils";

export const settingsGlassPrimaryButtonClassName =
    "rounded-sm border border-transparent bg-transparent px-3 text-ink shadow-none transition-colors hover:bg-surface-sunk hover:text-ink active:bg-surface-sunk disabled:cursor-not-allowed disabled:opacity-45";

export const settingsGlassIconButtonClassName =
    "justify-center rounded-sm bg-transparent px-1.5 text-ink-faint transition-colors hover:bg-surface-sunk hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

export function settingsTabButtonClassName(active: boolean) {
    return cn(
        "flex h-9 w-full items-center rounded-sm px-3 text-left text-sm font-medium whitespace-nowrap transition-colors",
        active
            ? "bg-surface-sunk text-ink"
            : "text-ink-muted hover:bg-paper hover:text-ink",
    );
}
