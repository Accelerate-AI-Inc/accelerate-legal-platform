"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { SURFACE_INSET_CLASS } from "@/shared/ui/SurfaceUI";

type SearchBarSize = "sm" | "normal";

type SearchBarProps = Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "size" | "type" | "value"
> & {
    value: string;
    onValueChange: (value: string) => void;
    size?: SearchBarSize;
    /** Accessible name for the input; the placeholder alone is not a label. */
    label?: string;
    clearLabel?: string;
    wrapperClassName?: string;
    inputClassName?: string;
};

const sizeClasses: Record<
    SearchBarSize,
    { wrapper: string; input: string; icon: string; clear: string }
> = {
    sm: {
        wrapper: "h-8 gap-1.5 rounded-sm px-2.5",
        input: "text-xs",
        icon: "h-3 w-3",
        clear: "h-5 w-5",
    },
    normal: {
        wrapper: "h-9 gap-2 rounded-sm px-3",
        input: "text-sm",
        icon: "h-3.5 w-3.5",
        clear: "h-6 w-6",
    },
};

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
    (
        {
            value,
            onValueChange,
            size = "normal",
            clearLabel = "Clear search",
            label = "Search",
            placeholder = "Search...",
            className,
            wrapperClassName,
            inputClassName,
            ...props
        },
        ref,
    ) => {
        const classes = sizeClasses[size];

        return (
            <div
                data-slot="search-bar"
                className={cn(
                    `flex items-center text-ink ${SURFACE_INSET_CLASS} transition-colors focus-within:ring-2 focus-within:ring-accent/40`,
                    classes.wrapper,
                    className,
                    wrapperClassName,
                )}
            >
                <Search
                    className={cn(
                        "shrink-0 text-ink-faint",
                        classes.icon,
                    )}
                />
                <input
                    ref={ref}
                    type="search"
                    value={value}
                    placeholder={placeholder}
                    aria-label={label}
                    onChange={(event) => onValueChange(event.target.value)}
                    className={cn(
                        // The wrapper carries the focus ring, so the input's own
                        // outline is suppressed to avoid a double indicator.
                        "min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden",
                        classes.input,
                        inputClassName,
                    )}
                    {...props}
                />
                {value ? (
                    <button
                        type="button"
                        onClick={() => onValueChange("")}
                        className={cn(
                            "flex shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface/70 hover:text-ink-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                            classes.clear,
                        )}
                        aria-label={clearLabel}
                    >
                        <X className={classes.icon} />
                    </button>
                ) : null}
            </div>
        );
    },
);

SearchBar.displayName = "SearchBar";
