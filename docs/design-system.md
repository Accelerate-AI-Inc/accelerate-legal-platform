# Design system

Accelerate Legal uses Tailwind v4 with shadcn-derived `new-york` primitives for
selected controls, alongside its own editorial surface system. Lucide supplies
the icon set. This page documents what already exists so contributors can reuse
it instead of re-deriving it. It is a description of the current system, not a
proposal for a new one.

The design language is **editorial and flat**: opaque fills, hairline rules, and
high-contrast serif display type. There is no translucency except in one place,
and no elevation except on true overlays. If a change needs a new shadow or a
new blur, it is almost certainly reaching for the wrong tier.

## Where things live

| File | What it owns |
| --- | --- |
| `frontend/src/shared/ui/TokensUI.css` | **The token layer.** Color and radius, plus the `@theme inline` mappings and the shared base layer. Imported by both the web app and the Word add-in. |
| `frontend/src/shared/ui/SurfaceUI.css` / `.ts` | The material system: five surface tiers and their class-name constants. |
| `frontend/src/shared/ui/RoleTokensUI.css` | Semantic color roles — highlights, citations, editor prose, spreadsheet chrome — and the shared interactive-state classes. |
| `frontend/src/app/globals.css` | The web entry point: font mapping, utilities, and component CSS (Tiptap, PDF, DOCX, case documents). |
| `word-addin/src/shared/styles/tokens.css` | The add-in entry point: imports `TokensUI.css` and maps its own font variables. Nothing else. |
| `frontend/src/app/components/ui/surface.ts` | Composed surface classes for app containers. |

`src/shared/ui/` may not import from `src/app/`. It is compiled into the add-in
build, which has no Next.js app directory. When you add a file there you must
also register it for Tailwind class scanning in
`word-addin/src/taskpane/styles.css`:

```css
@source "../../../frontend/src/shared/ui/YourThingUI.tsx";
```

A missing `@source` entry does not fail the build — Tailwind silently stops
emitting those classes in the add-in only. It is the easiest thing in this
system to get wrong.

| Location | What belongs there |
| --- | --- |
| `frontend/src/app/components/ui/` | Shared web primitives. Small, unopinionated, no data fetching, no feature knowledge. |
| `frontend/src/shared/ui/` | Primitives shared by the web app **and** the Word add-in. Framework-light: React, `lucide-react`, `clsx`, `tailwind-merge` only. |
| `frontend/src/app/components/shared/` | App-level building blocks that assume the app shell — the table layer (`TablePrimitive.tsx`, `TableToolbar.tsx`), `PageHeader`, `AppSidebar`, `CommandPalette`. |
| `frontend/src/app/components/<feature>/` | Feature components. Compose the above; do not restate their markup. |

The convention for a cross-target primitive is a `XxxUI.tsx` in `src/shared/ui/`
plus a thin re-export in `components/ui/` so web callers use one import path —
see `CardUI`/`card.tsx`, `PillButtonUI`/`pill-button.tsx`, and
`IconButtonUI`/`icon-button.tsx`. `BrandMarkUI` similarly owns the single mark
implementation used by thin web and Word add-in re-exports.

## Color tokens

Every color a component needs is a token in `TokensUI.css`. There are **no raw
Tailwind palette classes and no hex literals in component code** — if you find
yourself typing `bg-gray-100` or `#f3f4f6`, the token you want already exists.

### Surfaces and ink

| Token | Utility | Light value | Intent |
| --- | --- | --- | --- |
| `--paper` | `bg-paper` | `#faf8f5` | Page canvas. Warm, not white. |
| `--surface` | `bg-surface` | `#ffffff` | Resting surface of a panel, table, menu. |
| `--surface-sunk` | `bg-surface-sunk` | `#f4f1ec` | Inputs, wells, hovered rows. |
| `--rule` | `border-rule` | `#e3ded5` | Hairline. The primary separator device. |
| `--rule-strong` | `border-rule-strong` | `#cdc6ba` | Control boundaries. **This is the token that must clear 3:1** (WCAG 1.4.11); `--rule` must not be used for a control boundary. |
| `--ink` | `text-ink` | `#17181c` | Body and heading text. |
| `--ink-muted` | `text-ink-muted` | `#5c5f68` | Secondary text. |
| `--ink-faint` | `text-ink-faint` | `#8b8e96` | Metadata, placeholders, decorative icons. |

`rule-b`, `rule-b-strong`, `rule-t` and `rule-r` are single-edge rule utilities,
for when a full border would be wrong (a masthead underline, a sidebar edge).

### Brand accent

| Token | Utility | Light value | Intent |
| --- | --- | --- | --- |
| `--accent` | `bg-accent`, `text-accent` | `#8a2433` | Oxblood. Primary actions, links, active nav, citation highlights. |
| `--accent-hover` | `hover:bg-accent-hover` | `#6f1c29` | Hover only. |
| `--accent-wash` | `bg-accent-wash` | 6% oxblood | A **tint**, never a fill. Selected rows, badge backgrounds. |
| `--accent-contrast` | `text-accent-contrast` | `#ffffff` | Text on an accent fill. |

### Status and categories

`--positive`, `--critical`, `--caution` each have a `-wash` partner. Foregrounds
and borders take the bare token; backgrounds take the wash. Every red, green and
amber in the app maps onto these three.

Genuinely categorical color — tabular tags, currencies, column formats — uses
`--cat-1` … `--cat-8` with matching `-wash` values: muted print-ink hues chosen
to sit alongside oxblood. Never reach for a raw Tailwind hue for a category;
that is what this scale is for.

### shadcn semantic tokens

The standard shadcn set (`background`/`foreground`, `card`, `popover`,
`primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`,
`ring`, the `sidebar-*` family, `chart-1`…`chart-5`) is present and wired
through `@theme inline` **pointing at the editorial tokens**, so anything pulled
from the shadcn registry inherits this theme with no adaptation. Use these when
you want the meaning ("this is the destructive action") rather than a specific
color.

### Dark mode

`@custom-variant dark (&:is(.dark *))` — class-based, not
`prefers-color-scheme`, because the preference is a server-persisted
`user_profiles` field. Every token has a `.dark` value, so semantic classes
switch without component-level `dark:` recipes.

The preference lives in Settings → Appearance and is applied by `applyDarkMode`
in `frontend/src/app/lib/theme.ts`, which also mirrors it into an
`accelerate-theme` cookie. A blocking inline script in `layout.tsx` reads that
cookie before first paint; without it the theme could only be applied after the
profile fetch resolved, which is a visible light flash. If you change how the
preference is stored, keep both halves in step.

`BrandMark` needs no special handling: it is drawn in `currentColor` and the
accent token, so it is correct in both themes with one markup. Anything else
drawing brand-colored SVG should follow the same rule rather than swapping
palettes at runtime.

## Typography

Three faces, loaded with `next/font/google` in `frontend/src/app/layout.tsx` and
exposed as CSS variables:

| Face | Variable | Utility | Used for |
| --- | --- | --- | --- |
| Inter Tight | `--font-inter-tight` → `--font-sans` | `font-sans` (body default) | All UI chrome. |
| Newsreader | `--font-newsreader` → `--font-serif` | `font-serif` | Page titles, hero copy, legal document body, tracked-change cards. |
| IBM Plex Mono | `--font-plex-mono` → `--font-mono` | `font-mono` | Citations, metadata, IDs, `⌘K` hints, eyebrow labels. |

The Word add-in supplies the same three variables from
`word-addin/src/taskpane/styles.css` (fonts loaded via `<link>` in
`index.html`), so `shared/ui` components render identically in both targets.
`global-error.tsx` renders outside the token layer and inlines the palette and
two of the three faces; keep it in step with `:root`.

Two utilities carry the editorial voice:

- **`.text-eyebrow`** — 11px uppercase mono with `0.08em` tracking. This is the
  label device: section headers in the sidebar and settings nav, metadata keys,
  breadcrumb eyebrows, status text. It replaces decorative pill badges, which
  `AGENTS.md` already prefers against.
- **`.text-display`** — the serif display style. In practice you rarely need it
  directly: pass `title` to `PageHeader` and use `EmptyState` for empty-state
  headings, so the display style stays in one place.

## Spacing and radius

There is no bespoke spacing scale — Tailwind's default applies. The de facto
subset in use, by frequency:

- Horizontal padding: `px-3` (dominant), `px-2`, `px-4`, `px-2.5`
- Vertical padding: `py-2` (dominant), `py-1.5`, `py-1`, `py-0.5`
- Gaps: `gap-2`, `gap-1.5`, `gap-1`, `gap-3`
- Control heights: `h-7` (compact chrome: pills, icon buttons), `h-8`, `h-9`,
  `h-10` (table rows)

Radius is deliberately tight: `--radius: 0.25rem`, with the shadcn scale derived
from it. In practice the app uses `rounded-sm` almost everywhere — panels,
inputs, cards, menus and rows share one radius, which is part of what makes the
system read as flat.

`rounded-full` survives **only** on the established interactive pill controls:
`PillButton`, `TabPillButton`, `OptionPill`, `IconButton`. A one-off
`rounded-[13px]` is the kind of drift this document exists to prevent.

## The surface system

Five tiers. Each class owns all three material properties — background, border
and shadow — through light/dark variables in `SurfaceUI.css`, so components
never restate a surface border or invent a `box-shadow` recipe. Import the
constants from `SurfaceUI.ts` rather than typing the class strings.

| Material | Class / constant | Use for |
| --- | --- | --- |
| Panel | `surface-panel` / `SURFACE_PANEL_CLASS` | Broad resting surfaces: tables, cards, message bodies, docked side panels, auth cards. Opaque fill, 1px `--rule`, no shadow. |
| Inset | `surface-inset` / `SURFACE_INSET_CLASS` | Recessed controls: inputs, dropdown triggers, search, tab pills, icon buttons. `--surface-sunk` fill, 1px `--rule-strong`. |
| Chrome | `surface-chrome` / `SURFACE_CHROME_CLASS` | Persistent app chrome. In practice only `AppSidebar`, paired with a `rule-r` edge. Opaque fill, **no border of its own** — the caller picks the edge. |
| Overlay | `surface-overlay` / `SURFACE_OVERLAY_CLASS` | Anything detached from the page: modal frames, open menus, popovers, floating cell surfaces, toasts, the command palette. Opaque fill, 1px `--rule-strong`, and **the only elevation recipe in the system**. |
| Veil | `surface-veil` / `SURFACE_VEIL_CLASS` | The chat composer and ask-input surfaces, where messages visibly pass underneath. The only remaining blur. `surface-veil-action` is its compact over-content variant. |

The distinction that matters most in practice: **chrome is part of the page,
overlay floats above it.** A menu, popover or toast is an overlay even when it
is anchored to a control. Getting this wrong produces a menu with no boundary
that bleeds into the content behind it.

Interactive color is separate from elevation so every tier shares one treatment:

| State | Class constant | Rendered class | Use for |
| --- | --- | --- | --- |
| Hover | `SURFACE_HOVER_CLASS` | `surface-hover` | Controls and rows outside an overlay. |
| Selected | `SURFACE_SELECTED_CLASS` | `surface-selected` | Selected controls and rows. Accent wash. |
| Pressed | `SURFACE_PRESSED_CLASS` | `surface-pressed` | Momentary press feedback. |
| Group hover | `SURFACE_GROUP_HOVER_CLASS` | `surface-group-hover` | A child that responds to its row's hover. |
| Overlay row hover | `OVERLAY_ROW_HOVER_CLASS` | `overlay-row-hover` | `FileDirectory`, quick actions, workflow picker — rows on an overlay frame. |
| Overlay row selected | `OVERLAY_ROW_SELECTED_CLASS` | `overlay-row-selected` | Selected rows on an overlay frame. |

The overlay-row pair is intentionally distinct because an overlay's resting fill
differs from the page's. Do not use it for inputs or buttons merely because they
appear inside a modal; it is for selectable list rows on the overlay frame.

Compose the materials through the established constants in
`components/ui/surface.ts`:

- `TABLE_SURFACE_CLASS` — tables and broad containers
- `SIDE_PANEL_SURFACE_CLASS` — docked side panels
- `INSET_PANEL_SURFACE_CLASS` — recessed control groups
- `OVERLAY_SURFACE_CLASS` — detached overlays
- `CARD_SURFACE_CLASS` / `SurfaceCard` — cards
- `MenuContent` / `MenuSurface` — menus
- `IconButton` — circular icon buttons

## Primitives in `components/ui/`

| Primitive | Use it for |
| --- | --- |
| `button` | shadcn's button. Variant/size API, `asChild`. Note it has no `type` default — set `type="button"` inside a form. |
| `pill-button` | The app's primary action button. `tone`: `ink` \| `paper` \| `accent` \| `critical`. Shared with the add-in via `PillButtonUI`. |
| `tab-pill-button` | Segmented filter/tab pills. Pass `active` to get `aria-pressed`. |
| `icon-button` | Circular icon button — modal close, panel dismiss. Requires `aria-label`. |
| `cite-button` | Copy-quote-and-citation control. |
| `input`, `form-field` | shadcn input; `FormTextInput` and `FieldLabel` for app forms. |
| `search-bar` | Search input with clear button. Pass `label` for a meaningful accessible name. |
| `toggle-switch` | `role="switch"` toggle with a text label. |
| `dropdown-menu` | Radix/shadcn menu primitives. |
| `menu-surface` | The editorial skin over `dropdown-menu` — use this in app chrome. |
| `CitationPillUI` | Canonical numbered citation control for web, tabular review, and Word. Mono numerals; neutral by default, critical for verification errors, accent when selected. |
| `card`, `surface` | Card component and the composed surface class constants. |
| `empty-state` | Icon + serif display heading + copy + optional action, for "nothing here yet". Wrap in `TableEmptyState` inside a table. |
| `check-square` | The selection square used by directory/picker rows. Decorative by default; the row owns the ARIA state. |

For a real standalone checkbox use `<input type="checkbox">` with
`TABLE_CHECKBOX_CLASS` (see `TablePrimitive.tsx`), not `check-square`.

## Icons

Lucide only, drawn inline in `currentColor` at Lucide's own stroke weight. There
are **no icon assets in `frontend/public/`** — the app previously shipped a set
of full-color gradient SVGs fetched through `next/image` with cache-busting
query strings, and each one carried its own lighting and vendor color that
fought the surface it sat on and could not follow the theme.

The three icon modules worth knowing:

- `AppSidebarIcons.tsx` — the nav set, re-exported from Lucide under
  intention-revealing names (`MattersIcon`, `ReviewsIcon`, …).
- `FileTypeIcon.tsx` — document type by silhouette. `fileTypeKind()` normalizes
  either a `file_type` value or a filename.
- `FolderSvgIcon.tsx` — directory icons. A matter reads as a briefcase, a folder
  as a folder, so the two levels of the tree stay distinguishable without color.
- `LegalSourceIcon.tsx` — gavel for case law, scales for legislation.

## Page structure

`PageHeader` is the editorial masthead and every page uses it:

```
EYEBROW                        (.text-eyebrow, --ink-faint)
Page title                     (serif display, --ink)
───────────────────────────    (rule-b-strong, full bleed)
[ search ]        [ actions ]  (actions row beneath the rule)
```

Pass `title` (and optionally `eyebrow`) rather than your own `<h1>` — the
masthead owns the display style. Use `breadcrumbs` for a nested page; it keeps a
measurement-based collapse system for narrow viewports, and its `usePageChrome()`
portal moves the actions into the mobile header. Both are non-obvious and
correct; leave them alone.

Below the masthead, `TableToolbar` carries tab pills and filters, and
`TableScrollArea` + the `TablePrimitive` family carry the table itself.

## Information architecture

`AppSidebar` groups its destinations rather than listing them flat:

- **Work** — Assistant, Matters, Reviews
- **Knowledge** — Library, Resources
- **Automate** — Workflows
- Footer — History, Settings, account menu

"Matters" is the profession's word for a project, but `projects` remains the
route, the table and the type name — the relabel is copy only, which is what
keeps URLs and the e2e suite stable. Settings groups its nine destinations the
same way (Profile / Models / Security & Data).

`CommandPalette` (`⌘K`) is the cross-entity jump-to: navigation plus matters,
documents, workflows and resources. It reaches the same routes the sidebar does
— a faster path, never a privileged one.

## Choosing: existing primitive, shadcn registry, or a one-off

Work down this list and stop at the first that fits.

1. **A primitive in `components/ui/` (or `shared/ui/`) already does it.** Use
   it. If it is 90% right, add a prop or a variant to the primitive rather than
   forking it — a fork is how the duplication this document consolidates got
   there in the first place.
2. **A shadcn registry component does it.** Add it with the shadcn CLI so it
   lands in `components/ui/` with the project's `new-york` style and CSS
   variables, then adapt it in place. Prefer this over hand-rolling anything
   with non-trivial interaction or ARIA (menus, dialogs, popovers, tooltips).
3. **The markup is genuinely feature-specific and appears once.** Write it in
   the feature directory. One occurrence is not a primitive.
4. **The same markup now appears in two or more feature files.** Promote it:
   move it into `components/ui/` with a small prop surface, replace every copy,
   and add a test. Put it in `shared/ui/` instead only if the Word add-in needs
   it too.

Do not add a new UI dependency to solve something Tailwind plus an existing
primitive covers.

## Accessibility baseline

These are the rules the primitives already follow. Match them in new work. The
editorial palette makes the contrast rule *more* load-bearing than it was under
a shadowed system, because hairlines are now the primary affordance.

- **Focus is always visible.** Use `FOCUS_RING_CLASS` from `SurfaceUI.ts`, which
  renders `focus-visible:ring-2 focus-visible:ring-accent/45` with an offset. If
  you write `outline-none` you owe the element a replacement indicator in the
  same class string.
- **A background tint is not a focus indicator** when the tint is a small
  luminance step. Menu items pair the semantic focus tint with a ring for this
  reason.
- **Non-text contrast ≥ 3:1** for control boundaries (WCAG 1.4.11).
  `--rule-strong` is the token that clears it; `--rule` does not, and must not be
  used for a control boundary.
- **Icon-only controls need a name.** `IconButton` requires `aria-label` in its
  type. When a control has a *visible* label, do not override it with a
  different `aria-label` (WCAG 2.5.3).
- **`type="button"` on every non-submit button.** Anything inside a `<form>`
  defaults to submitting.
- **State goes in ARIA, not only in color.** `toggle-switch` uses
  `role="switch"` + `aria-checked`, `tab-pill-button` uses `aria-pressed`, nav
  items use `aria-current="page"`, `check-square` callers that own the
  interaction pass `role="checkbox"` + `aria-checked` (`"mixed"` for
  indeterminate).
- **Decorative elements are hidden.** Icons inside a labelled control get
  `aria-hidden`.

## Related

- Frontend test conventions: [frontend-testing.md](frontend-testing.md)
- Component catalog (Storybook or Ladle): not set up yet
