"use client";

import {
    forwardRef,
    type HTMLAttributes,
    type InputHTMLAttributes,
    type ReactNode,
} from "react";
import { cn } from "@/app/lib/utils";
import { SURFACE_INSET_CLASS } from "@/shared/ui/SurfaceUI";

// `outline-none` removes the browser's focus indicator, so every variant has to
// supply its own `focus-visible:` ring or the field becomes unusable by keyboard.
const FOCUS_RING_CLASS =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2";

export const FORM_CONTROL_CLASS =
    `w-full rounded-sm px-3 text-sm text-ink ${SURFACE_INSET_CLASS} outline-none placeholder:text-ink-faint transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING_CLASS}`;

type FormTextInputVariant = "glass" | "minimal";

type FormTextInputProps = InputHTMLAttributes<HTMLInputElement> & {
    variant?: FormTextInputVariant;
};

const variantClasses: Record<FormTextInputVariant, string> = {
    glass: cn("h-10", FORM_CONTROL_CLASS),
    minimal: cn(
        "w-full rounded bg-transparent font-serif text-2xl text-ink outline-none placeholder:text-ink-faint disabled:cursor-not-allowed disabled:text-ink-faint",
        FOCUS_RING_CLASS,
    ),
};

export const FormTextInput = forwardRef<HTMLInputElement, FormTextInputProps>(
    ({ className, variant = "glass", ...props }, ref) => (
        <input
            ref={ref}
            className={cn(variantClasses[variant], className)}
            {...props}
        />
    ),
);

FormTextInput.displayName = "FormTextInput";

// Element-agnostic so the same props spread onto a label, p or span.
type FieldLabelProps = Omit<HTMLAttributes<HTMLElement>, "className"> & {
    children: ReactNode;
    as?: "label" | "p" | "span";
    htmlFor?: string;
};

export function FieldLabel({
    as = "label",
    children,
    htmlFor,
    ...props
}: FieldLabelProps) {
    const classes = "mb-2 block text-sm font-medium text-ink";

    // The non-label variants still need forwarded props: `id` is what lets a
    // caller point `aria-labelledby` at them.
    if (as === "p")
        return (
            <p className={classes} {...props}>
                {children}
            </p>
        );
    if (as === "span")
        return (
            <span className={classes} {...props}>
                {children}
            </span>
        );

    return (
        <label className={classes} htmlFor={htmlFor} {...props}>
            {children}
        </label>
    );
}
