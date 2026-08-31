"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { MenuContent, MenuItem } from "@/app/components/ui/menu-surface";
import { SURFACE_HOVER_CLASS } from "@/shared/ui/SurfaceUI";

/**
 * A single-select facet control for the resources toolbar.
 *
 * `TableFilters` in TablePrimitive is bound to a closed union of options known
 * at compile time; these facets come from the server, so this takes a plain
 * string list. The selected value is shown as text on the trigger rather than
 * as a pill, per the informational-labels rule in AGENTS.md.
 */
export function ResourceFacetFilter({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string | null;
    options: string[];
    onChange: (value: string | null) => void;
}) {
    const [open, setOpen] = useState(false);
    if (options.length === 0) return null;

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label={`Filter by ${label.toLowerCase()}`}
                    className={`flex h-7 items-center gap-1.5 rounded-sm px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${
                        value ? "text-ink" : "text-ink-muted hover:text-ink"
                    } ${SURFACE_HOVER_CLASS}`}
                >
                    <span className="text-eyebrow text-ink-faint">{label}</span>
                    <span className="max-w-[110px] truncate">
                        {value ?? "Any"}
                    </span>
                    <ChevronDown
                        aria-hidden="true"
                        className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                </button>
            </DropdownMenuTrigger>
            <MenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
                <MenuItem
                    selected={value === null}
                    onSelect={() => onChange(null)}
                >
                    Any {label.toLowerCase()}
                </MenuItem>
                {options.map((option) => (
                    <MenuItem
                        key={option}
                        selected={option === value}
                        onSelect={() => onChange(option)}
                    >
                        {option}
                    </MenuItem>
                ))}
            </MenuContent>
        </DropdownMenu>
    );
}
