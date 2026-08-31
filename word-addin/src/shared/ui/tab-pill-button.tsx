"use client";

import * as React from "react";
import { cn } from "../lib/utils";

type TabPillButtonProps = React.ComponentProps<"button"> & {
    active?: boolean;
};

/**
 * Duplicated from the web app's glass pill tab
 * (frontend/src/app/components/ui/tab-pill-button.tsx) so the pane's tab bar
 * looks exactly like the web's. Only the `cn` import path differs.
 */
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
              ? "border-rule/60 bg-surface/45 text-ink-faint hover:bg-surface/65 hover:text-ink"
              : "border-rule/70 bg-surface/65 text-ink hover:bg-surface hover:text-ink";

    return (
        <button
            type={type}
            aria-pressed={active}
            className={cn(
                "inline-flex h-7 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all active:scale-[0.98] disabled:cursor-default disabled:opacity-40 disabled:active:scale-100",
                stateClass,
                className,
            )}
            {...props}
        />
    );
}
