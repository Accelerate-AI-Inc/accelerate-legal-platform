"use client";

import { MoreHorizontal, type LucideIcon } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import {
    MenuContent,
    MenuItem,
} from "@/app/components/ui/menu-surface";
import { cn } from "@/app/lib/utils";
import { SURFACE_HOVER_CLASS } from "@/app/components/ui/surface";

export type HeaderActionsMenuItem = {
    label: string;
    icon?: LucideIcon;
    onSelect: () => void;
    disabled?: boolean;
    variant?: "default" | "danger";
};

export function HeaderActionsMenu({
    items,
    title = "Actions",
}: {
    items: HeaderActionsMenuItem[];
    title?: string;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-all",
                        SURFACE_HOVER_CLASS,
                        "hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rule-strong",
                    )}
                    aria-label={title}
                    title={title}
                >
                    <MoreHorizontal className="h-4 w-4" />
                </button>
            </DropdownMenuTrigger>
            <MenuContent align="end" className="z-[160] w-48">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <MenuItem
                            key={item.label}
                            disabled={item.disabled}
                            variant={
                                item.variant === "danger"
                                    ? "destructive"
                                    : "default"
                            }
                            onSelect={item.onSelect}
                            className={cn(
                                "cursor-pointer text-xs",
                                item.variant === "danger" &&
                                    "text-critical focus:bg-critical-wash focus:text-critical",
                            )}
                        >
                            {Icon && <Icon className="h-3.5 w-3.5" />}
                            {item.label}
                        </MenuItem>
                    );
                })}
            </MenuContent>
        </DropdownMenu>
    );
}
