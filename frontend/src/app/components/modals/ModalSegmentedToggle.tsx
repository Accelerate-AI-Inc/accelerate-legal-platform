"use client";

import type { ComponentType } from "react";
import { cn } from "@/app/lib/utils";
import {
    SURFACE_HOVER_CLASS,
    SURFACE_SELECTED_CLASS,
    SURFACE_INSET_CLASS,
} from "@/shared/ui/SurfaceUI";

export interface SegmentedToggleOption<T extends string> {
    value: T;
    label: string;
    icon?: ComponentType<{ className?: string }>;
}

interface ModalSegmentedToggleProps<T extends string> {
    value: T;
    onChange: (value: T) => void;
    options: SegmentedToggleOption<T>[];
    disabled?: boolean;
    size?: "sm" | "md";
    className?: string;
}

export function ModalSegmentedToggle<T extends string>({
    value,
    onChange,
    options,
    disabled = false,
    size = "md",
    className,
}: ModalSegmentedToggleProps<T>) {
    return (
        <div
            className={cn(
                `inline-grid gap-1 rounded-full ${SURFACE_INSET_CLASS}`,
                size === "sm" ? "h-8 p-1" : "h-9 p-1",
                className,
            )}
            style={{
                gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
            }}
        >
            {options.map((option) => {
                const Icon = option.icon;
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        disabled={disabled}
                        aria-pressed={active}
                        className={cn(
                            "flex h-full items-center justify-center rounded-full text-xs transition-all disabled:cursor-not-allowed disabled:opacity-60",
                            size === "sm" ? "gap-1 px-3" : "gap-1.5 px-3",
                            active
                                ? `${SURFACE_SELECTED_CLASS} text-ink`
                                : `${SURFACE_HOVER_CLASS} text-ink-muted hover:text-ink`,
                        )}
                    >
                        {Icon && (
                            <Icon
                                className={
                                    size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"
                                }
                            />
                        )}
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
