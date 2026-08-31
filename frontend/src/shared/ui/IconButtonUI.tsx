"use client";

import { type ButtonHTMLAttributes, type ReactElement } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { FOCUS_RING_CLASS, SURFACE_HOVER_CLASS, SURFACE_INSET_CLASS } from "./SurfaceUI";

export type IconButtonUIProps = Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "className"
> & {
    className?: string;
    /** Required: the button is icon-only, so it has no text to name it. */
    "aria-label": string;
};

const BASE_CLASS = clsx(
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-ink",
    SURFACE_INSET_CLASS,
    SURFACE_HOVER_CLASS,
    FOCUS_RING_CLASS,
);

export function iconButtonUIClassName(className?: string) {
    return twMerge(clsx(BASE_CLASS, className));
}

/** Canonical circular icon button (modal close, panel dismiss, …). */
export function IconButtonUI({
    type = "button",
    className,
    ...props
}: IconButtonUIProps): ReactElement {
    return (
        <button
            type={type}
            className={iconButtonUIClassName(className)}
            {...props}
        />
    );
}
