import { CARD_SURFACE_CLASS } from "@ax/card-ui";

export const RESPONSE_SURFACE_CLASS = CARD_SURFACE_CLASS;

// No backdrop-blur here: these surfaces are fully opaque (bg-surface), so the
// blur is invisible while still costing a compositing layer per card in the
// Office WebView.
export const EDIT_CARD_SURFACE =
  "rounded-sm bg-surface";

export const EDIT_SECTION_SURFACE = RESPONSE_SURFACE_CLASS;
