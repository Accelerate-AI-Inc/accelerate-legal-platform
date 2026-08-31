"use client";

import {
    type ButtonHTMLAttributes,
    type ReactElement,
    type ReactNode,
} from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { FOCUS_RING_CLASS, SURFACE_HOVER_CLASS, SURFACE_PANEL_CLASS } from "./SurfaceUI";

export type PillButtonUITone = "ink" | "paper" | "accent" | "critical";
export type PillButtonUISize = "sm" | "normal";

export type PillButtonUIProps = Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "className"
> & {
    children?: ReactNode;
    className?: string;
    tone: PillButtonUITone;
    size?: PillButtonUISize;
};

/* Flat fills only. Depth comes from the tone contrast against the page, not
   from a bevel — see docs/design-system.md, "Elevation". */
const toneClasses: Record<PillButtonUITone, string> = {
    ink: "bg-ink text-paper hover:bg-ink/88 disabled:hover:bg-ink",
    paper: `${SURFACE_PANEL_CLASS} ${SURFACE_HOVER_CLASS} text-ink`,
    accent: "bg-accent text-accent-contrast hover:bg-accent-hover disabled:hover:bg-accent",
    critical:
        "bg-critical text-accent-contrast hover:bg-critical/88 disabled:hover:bg-critical",
};

const sizeClasses: Record<PillButtonUISize, string> = {
    sm: "px-2.5 py-1 text-xs",
    normal: "px-4 py-1.5 text-sm",
};

export function pillButtonUIClassName({
    tone,
    size = "sm",
    className,
}: {
    tone: PillButtonUITone;
    size?: PillButtonUISize;
    className?: string;
}) {
    return twMerge(
        clsx(
            "inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
            FOCUS_RING_CLASS,
            toneClasses[tone],
            sizeClasses[size],
            className,
        ),
    );
}

/** Canonical pill button shared by the web app and Word add-in. */
export function PillButtonUI({
    tone,
    size = "sm",
    type = "button",
    className,
    ...props
}: PillButtonUIProps): ReactElement {
    return (
        <button
            type={type}
            className={pillButtonUIClassName({ tone, size, className })}
            {...props}
        />
    );
}
