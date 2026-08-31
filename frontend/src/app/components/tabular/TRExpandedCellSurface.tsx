import type { ReactNode } from "react";
import { SURFACE_OVERLAY_CLASS } from "@/shared/ui/SurfaceUI";

export function TRExpandedCellSurface({ children }: { children: ReactNode }) {
    return (
        <div className={`absolute left-0 top-0 z-50 w-full rounded-sm ${SURFACE_OVERLAY_CLASS}`}>
            {children}
        </div>
    );
}
