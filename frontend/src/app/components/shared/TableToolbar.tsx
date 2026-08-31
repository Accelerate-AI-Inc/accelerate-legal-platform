"use client";

import React, { useSyncExternalStore } from "react";
import { Settings2 } from "lucide-react";
import { TabPillButton } from "@/app/components/ui/tab-pill-button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { MenuContent } from "@/app/components/ui/menu-surface";
import {
    SURFACE_HOVER_CLASS,
    SURFACE_INSET_CLASS,
} from "@/shared/ui/SurfaceUI";

const DESKTOP_QUERY = "(min-width: 768px)";

function subscribeToDesktopQuery(onStoreChange: () => void) {
    if (typeof window === "undefined") return () => {};
    const query = window.matchMedia(DESKTOP_QUERY);
    query.addEventListener("change", onStoreChange);
    return () => query.removeEventListener("change", onStoreChange);
}

function getDesktopSnapshot() {
    if (typeof window === "undefined") return true;
    return window.matchMedia(DESKTOP_QUERY).matches;
}

function getDesktopServerSnapshot() {
    return true;
}

interface ToolbarItem<T extends string> {
    id: T;
    label: string;
}

interface Props<T extends string> {
    items?: ToolbarItem<T>[];
    active?: T;
    onChange?: (id: T) => void;
    /** Optional content rendered on the left before any tab items */
    leading?: React.ReactNode;
    /** Optional content rendered on the right side of the toolbar */
    actions?: React.ReactNode;
}

export function TableToolbar<T extends string>({
    items = [],
    active,
    onChange,
    leading,
    actions,
}: Props<T>) {
    const hasItems = items.length > 0;
    const isDesktop = useSyncExternalStore(
        subscribeToDesktopQuery,
        getDesktopSnapshot,
        getDesktopServerSnapshot,
    );

    return (
        <div className="mx-4 mb-2 flex h-10 items-center md:mx-8">
            {(leading || hasItems) && (
                <div className="-my-2 flex flex-1 items-center gap-1.5 overflow-x-auto py-2">
                    {leading}
                    {items.map((item) => (
                        <TabPillButton
                            key={item.id}
                            active={active === item.id}
                            onClick={() => onChange?.(item.id)}
                        >
                            {item.label}
                        </TabPillButton>
                    ))}
                </div>
            )}
            {actions && isDesktop && (
                <div className="ml-auto flex items-center gap-2">{actions}</div>
            )}
            {actions && !isDesktop && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            title="Toolbar actions"
                            aria-label="Toolbar actions"
                            className={`ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-ink ${SURFACE_INSET_CLASS} ${SURFACE_HOVER_CLASS} transition-colors hover:text-ink active:scale-[0.98]`}
                        >
                            <Settings2 className="h-3.5 w-3.5" />
                        </button>
                    </DropdownMenuTrigger>
                    <MenuContent
                        align="end"
                        className="z-[130] min-w-40 p-1"
                    >
                        <div className="flex flex-col gap-0.5 [&_.hidden]:inline [&>div]:flex [&>div]:flex-col [&>div]:items-stretch [&>div]:gap-0.5 [&_button]:h-auto [&_button]:w-full [&_button]:justify-start [&_button]:rounded-sm [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-3 [&_button]:py-2 [&_button]:text-left [&_button]:text-xs [&_button]:font-medium [&_button]:text-ink [&_button]:shadow-none [&_button]: [&_button]:transition-colors [&_button]:active:scale-100 [&_button:hover]:bg-surface-sunk [&_button:disabled]:opacity-40">
                            {actions}
                        </div>
                    </MenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}
