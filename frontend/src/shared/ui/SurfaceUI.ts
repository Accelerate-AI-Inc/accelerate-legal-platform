/**
 * Material class names for the Accelerate Legal surface system.
 *
 * Import these rather than typing the class strings — the material CSS lives
 * in SurfaceUI.css and is shared with the Word add-in. Interactive state
 * (hover/selected/pressed) is separate from elevation so every tier shares one
 * treatment; those classes live in RoleTokensUI.css.
 */

export const SURFACE_PANEL_CLASS = "surface-panel";
export const SURFACE_INSET_CLASS = "surface-inset";
export const SURFACE_CHROME_CLASS = "surface-chrome";
export const SURFACE_OVERLAY_CLASS = "surface-overlay";
export const SURFACE_VEIL_CLASS = "surface-veil";
export const SURFACE_VEIL_ACTION_CLASS = "surface-veil-action";

export const SURFACE_HOVER_CLASS = "surface-hover";
export const SURFACE_SELECTED_CLASS = "surface-selected";
export const SURFACE_PRESSED_CLASS = "surface-pressed";
export const SURFACE_GROUP_HOVER_CLASS = "surface-group-hover";
export const OVERLAY_ROW_HOVER_CLASS = "overlay-row-hover";
export const OVERLAY_ROW_SELECTED_CLASS = "overlay-row-selected";

/**
 * The focus indicator every interactive element owes the user. Editorial
 * surfaces rely on hairlines, so a background tint alone is never enough —
 * see docs/design-system.md, "Accessibility baseline".
 */
export const FOCUS_RING_CLASS =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-paper";
