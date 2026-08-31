"use client";

import * as React from "react";
import { cn } from "@/app/lib/utils";
import {
    SURFACE_HOVER_CLASS,
    SURFACE_INSET_CLASS,
} from "@/shared/ui/SurfaceUI";

type TabPillButtonProps = React.ComponentProps<"button"> & {
    active?: boolean;
};

export function TabPillButton({
    active,
    type = "button",
    className,
    ...props
}: TabPillButtonProps) {
    const stateClass =
        active === true
            ? "border-rule/80 bg-surface text-ink"
            : active === false
              ? `${SURFACE_HOVER_CLASS} text-ink-faint hover:text-ink`
              : `${SURFACE_HOVER_CLASS} text-ink hover:text-ink`;

    return (
        <button
            type={type}
            aria-pressed={active}
            className={cn(
                `inline-flex h-7 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium ${SURFACE_INSET_CLASS} transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-40 disabled:active:scale-100`,
                stateClass,
                className,
            )}
            {...props}
        />
    );
}
