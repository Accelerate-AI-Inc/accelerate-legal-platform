"use client";

import type { CSSProperties, ReactElement } from "react";

/**
 * The Accelerate Legal mark.
 *
 * An open bracket enclosing a rising bar — the editorial reading is a legal
 * citation bracket around forward motion. Drawn in `currentColor` and the
 * accent token rather than gradient stops, so unlike the mark it replaces it
 * needs no theme observer: it inherits whatever ink the surrounding surface
 * sets and is correct in both themes for free. Anything else drawing
 * brand-colored SVG should follow the same rule.
 *
 * `spin` drives the assistant's thinking state; `done` and `error` recolor the
 * rising bar to the status tokens.
 */
export type BrandMarkUIProps = {
    /** Rotate continuously — the assistant's working state. */
    spin?: boolean;
    /** Completed: the bar takes the positive token. */
    done?: boolean;
    /** Failed: the bar takes the critical token. */
    error?: boolean;
    size?: number;
    style?: CSSProperties;
    className?: string;
};

export function BrandMarkUI({
    spin = false,
    done = false,
    error = false,
    size = 24,
    style,
    className,
}: BrandMarkUIProps): ReactElement {
    const barColor = error
        ? "var(--critical)"
        : done
          ? "var(--positive)"
          : "var(--accent)";

    return (
        <span
            className={
                "inline-block shrink-0 animate-[spin_3s_linear_infinite]" +
                (className ? ` ${className}` : "")
            }
            style={{
                animationPlayState: spin ? "running" : "paused",
                ...style,
            }}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 32 32"
                width={size}
                height={size}
                fill="none"
                aria-hidden="true"
                focusable="false"
            >
                {/* Citation bracket, in the surrounding ink. */}
                <path
                    d="M11 4H6.5A1.5 1.5 0 0 0 5 5.5v21A1.5 1.5 0 0 0 6.5 28H11"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="square"
                />
                <path
                    d="M21 4h4.5A1.5 1.5 0 0 1 27 5.5v21a1.5 1.5 0 0 1-1.5 1.5H21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="square"
                />
                {/* Rising bar, in the accent — the "accelerate" figure. */}
                <path
                    d="M11.5 22.5 20.5 9.5"
                    stroke={barColor}
                    strokeWidth="2.5"
                    strokeLinecap="square"
                />
                <path
                    d="M20.5 9.5h-4.5M20.5 9.5v4.5"
                    stroke={barColor}
                    strokeWidth="2.5"
                    strokeLinecap="square"
                />
            </svg>
        </span>
    );
}
