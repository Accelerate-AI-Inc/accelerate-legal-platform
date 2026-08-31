"use client";

import * as React from "react";
import {
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuRadioItem,
} from "@/app/components/ui/dropdown-menu";
import { cn } from "@/app/lib/utils";
import { SURFACE_OVERLAY_CLASS } from "@/shared/ui/SurfaceUI";

const MENU_CHROME_CLASS =
    "rounded-sm";
const MENU_SURFACE_CLASS =
    `${MENU_CHROME_CLASS} ${SURFACE_OVERLAY_CLASS}`;

// The highlighted item has to be distinguishable from a merely hovered one:
// `app-surface-hover` is a ~1% luminance step, so focus also gets a ring.
const MENU_ITEM_CLASS =
    "theme-dropdown-item cursor-pointer text-xs text-ink-muted transition-colors focus:text-ink focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40";

export function MenuContent({
    className,
    ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
    return (
        <DropdownMenuContent
            className={cn(MENU_CHROME_CLASS, className)}
            {...props}
        />
    );
}

export const MenuSurface = React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<"div">
>(function MenuSurface({ className, ...props }, ref) {
    return (
        <div
            ref={ref}
            className={cn(MENU_SURFACE_CLASS, className)}
            {...props}
        />
    );
});

export function MenuItem({
    className,
    selected = false,
    ...props
}: React.ComponentProps<typeof DropdownMenuItem> & {
    selected?: boolean;
}) {
    return (
        <DropdownMenuItem
            data-selected={selected ? "true" : undefined}
            className={cn(
                MENU_ITEM_CLASS,
                selected && "text-ink",
                className,
            )}
            {...props}
        />
    );
}

export const MenuButton = React.forwardRef<
    HTMLButtonElement,
    React.ComponentPropsWithoutRef<"button">
>(function MenuButton({ className, type = "button", ...props }, ref) {
    return (
        <button
            ref={ref}
            type={type}
            className={cn(MENU_ITEM_CLASS, className)}
            {...props}
        />
    );
});

export function MenuRadioItem({
    className,
    ...props
}: React.ComponentProps<typeof DropdownMenuRadioItem>) {
    return (
        <DropdownMenuRadioItem
            className={cn(MENU_ITEM_CLASS, className)}
            {...props}
        />
    );
}

export function MenuCheckboxItem({
    className,
    ...props
}: React.ComponentProps<typeof DropdownMenuCheckboxItem>) {
    return (
        <DropdownMenuCheckboxItem
            className={cn(
                MENU_ITEM_CLASS,
                "pl-3 pr-8 [&>span]:right-2 [&>span]:left-auto",
                className,
            )}
            {...props}
        />
    );
}
