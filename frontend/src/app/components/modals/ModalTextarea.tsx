"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/app/lib/utils";
import { SURFACE_INSET_CLASS } from "@/shared/ui/SurfaceUI";

type ModalTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const ModalTextarea = forwardRef<
    HTMLTextAreaElement,
    ModalTextareaProps
>(({ className, ...props }, ref) => (
    <textarea
        ref={ref}
        className={cn(
            `min-h-24 w-full resize-none rounded-sm px-3 py-2.5 text-sm leading-relaxed text-ink ${SURFACE_INSET_CLASS} outline-none placeholder:text-ink-faint transition-colors disabled:cursor-not-allowed disabled:opacity-60`,
            className,
        )}
        {...props}
    />
));

ModalTextarea.displayName = "ModalTextarea";
