"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/app/lib/utils";
import { SURFACE_OVERLAY_CLASS } from "@/shared/ui/SurfaceUI";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({
    className,
    align = "center",
    sideOffset = 4,
    ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
    return (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
                data-slot="popover-content"
                align={align}
                sideOffset={sideOffset}
                className={cn(
                    `z-[250] rounded-sm p-3 text-ink outline-none ${SURFACE_OVERLAY_CLASS}`,
                    className,
                )}
                {...props}
            />
        </PopoverPrimitive.Portal>
    );
}
