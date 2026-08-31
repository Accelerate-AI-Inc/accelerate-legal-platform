import {
    SURFACE_PANEL_CLASS,
    SURFACE_INSET_CLASS,
    SURFACE_OVERLAY_CLASS,
} from "@/shared/ui/SurfaceUI";

/**
 * Composed surface classes for app-level containers.
 *
 * Reach for these rather than pairing a radius with a material by hand — the
 * radius is part of the design language, not a per-component choice.
 */

/** Tables and broad resting containers. */
export const TABLE_SURFACE_CLASS = `rounded-sm ${SURFACE_PANEL_CLASS}`;

/**
 * Docked side panels. Bordered but unshadowed: a panel is part of the page, not
 * floating above it. For a flush full-height rail (the app sidebar) use
 * `SURFACE_CHROME_CLASS` with a `rule-r` edge instead.
 */
export const SIDE_PANEL_SURFACE_CLASS = `rounded-sm ${SURFACE_PANEL_CLASS}`;

/** Recessed control groups and wells. */
export const INSET_PANEL_SURFACE_CLASS = `rounded-sm ${SURFACE_INSET_CLASS}`;

/** Detached overlays: menus, popovers, floating cell surfaces, toasts. */
export const OVERLAY_SURFACE_CLASS = `rounded-sm ${SURFACE_OVERLAY_CLASS}`;

export {
    SURFACE_PANEL_CLASS,
    SURFACE_CHROME_CLASS,
    SURFACE_GROUP_HOVER_CLASS,
    SURFACE_HOVER_CLASS,
    SURFACE_OVERLAY_CLASS,
    OVERLAY_ROW_HOVER_CLASS,
    OVERLAY_ROW_SELECTED_CLASS,
    SURFACE_PRESSED_CLASS,
    SURFACE_SELECTED_CLASS,
    SURFACE_INSET_CLASS,
    SURFACE_VEIL_ACTION_CLASS,
    SURFACE_VEIL_CLASS,
    FOCUS_RING_CLASS,
} from "@/shared/ui/SurfaceUI";
