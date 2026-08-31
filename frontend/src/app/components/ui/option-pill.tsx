"use client";

import type { ButtonHTMLAttributes, ReactElement } from "react";
import { cn } from "@/app/lib/utils";
import {
    SURFACE_HOVER_CLASS,
    SURFACE_INSET_CLASS,
} from "@/shared/ui/SurfaceUI";

export type OptionPillProps = ButtonHTMLAttributes<HTMLButtonElement>;

/** A compact removable option, distinct from an action button. */
export function OptionPill({
    type = "button",
    className,
    ...props
}: OptionPillProps): ReactElement {
    return (
        <button
            type={type}
            data-slot="option-pill"
            className={cn(
                `inline-flex max-w-full items-center justify-center gap-1.5 rounded-full px-2 py-1 text-xs font-normal text-ink ${SURFACE_INSET_CLASS} ${SURFACE_HOVER_CLASS} transition-colors disabled:cursor-not-allowed disabled:opacity-40`,
                className,
            )}
            {...props}
        />
    );
}
