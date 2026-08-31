import type { ReactNode } from "react";
import { SURFACE_PANEL_CLASS } from "./SurfaceUI";

export const CARD_SURFACE_CLASS =
    `rounded-sm ${SURFACE_PANEL_CLASS}`;

export function CardUI({ children }: { children: ReactNode }) {
    return <div className={CARD_SURFACE_CLASS}>{children}</div>;
}
