"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/app/lib/utils";

export const SETTINGS_CONTROL_CLASS =
    "w-full rounded-sm border border-transparent bg-surface-sunk px-3 text-sm text-ink shadow-none outline-none placeholder:text-ink-faint transition-colors focus:border-rule focus:ring-2 focus:ring-rule-strong/45 disabled:cursor-not-allowed disabled:opacity-60";

export const SettingsTextInput = forwardRef<
    HTMLInputElement,
    InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        className={cn("h-10", SETTINGS_CONTROL_CLASS, className)}
        {...props}
    />
));

SettingsTextInput.displayName = "SettingsTextInput";
