"use client";

import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export type CitationPillUIProps = Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "className"
> & {
    children: ReactNode;
    className?: string;
    active?: boolean;
};

const BASE_CLASS_NAME =
    "inline-flex h-4 w-4 items-center justify-center rounded-full bg-surface-sunk/80 text-[12px] font-serif font-medium text-ink transition-colors hover:bg-surface-sunk hover:text-ink";

/** Canonical numbered citation control shared by web and Word surfaces. */
export function CitationPillUI({
    type = "button",
    className,
    active = false,
    ...props
}: CitationPillUIProps): ReactElement {
    return (
        <button
            type={type}
            aria-current={active ? "true" : undefined}
            data-active={active ? "true" : undefined}
            className={twMerge(
                clsx(
                    BASE_CLASS_NAME,
                    active &&
                        "!bg-accent-wash !text-accent-wash hover:!bg-accent-wash hover:!text-accent-wash dark:!bg-accent-wash dark:!text-paper dark:hover:!bg-accent-wash dark:hover:!text-paper",
                    className,
                ),
            )}
            {...props}
        />
    );
}
