import type {
    ButtonHTMLAttributes,
    ComponentProps,
    ReactNode,
} from "react";
import {
    SURFACE_HOVER_CLASS,
    SURFACE_PRESSED_CLASS,
    SURFACE_INSET_CLASS,
} from "./SurfaceUI";

export function HeaderButtonsUI({
    className = "",
    ...props
}: ComponentProps<"div">) {
    return (
        <div
            className={`flex shrink-0 items-center gap-2 rounded-full px-1 py-1 ${SURFACE_INSET_CLASS} ${className}`}
            {...props}
        />
    );
}

export type HeaderButtonUIProps = Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "className"
> & {
    children?: ReactNode;
    className?: string;
    iconOnly?: boolean;
};

export function headerButtonClassName({
    iconOnly = false,
    disabled = false,
    className = "",
}: {
    iconOnly?: boolean;
    disabled?: boolean;
    className?: string;
} = {}) {
    return [
        "flex h-7 items-center justify-center rounded-full text-sm transition-colors disabled:cursor-default disabled:text-ink-faint disabled:hover:bg-transparent disabled:hover:text-ink-faint",
        SURFACE_HOVER_CLASS,
        SURFACE_PRESSED_CLASS,
        iconOnly ? "w-7" : "w-7 gap-1.5 px-0 sm:w-auto sm:px-3",
        disabled ? "cursor-default" : "cursor-pointer",
        "text-ink-muted hover:text-ink",
        className,
    ]
        .filter(Boolean)
        .join(" ");
}

export function HeaderButtonUI({
    children,
    className,
    iconOnly = false,
    disabled,
    type = "button",
    ...props
}: HeaderButtonUIProps) {
    return (
        <button
            type={type}
            disabled={disabled}
            className={headerButtonClassName({
                iconOnly,
                disabled,
                className,
            })}
            {...props}
        >
            {children}
        </button>
    );
}
