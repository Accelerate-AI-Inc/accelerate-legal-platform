# Desktop and mobile clients

This note compares the packaging approach used by
[LexEdge legal-hermes](https://github.com/Lexedgeai26/legal-hermes) with the
Accelerate Legal architecture, and lays out how Accelerate Legal can ship as a
macOS app, a Windows app, and an iOS app. It is a plan, not a description of
shipped behavior. Nothing in this document is implemented yet.

## Summary

- legal-hermes is a fork of the MIT-licensed Nous Research Hermes Agent. Its
  desktop app is an Electron shell that installs and runs a **local Python
  agent** on the user's machine. It has no iOS client.
- Accelerate Legal is a **hosted, multi-tenant** service: Supabase Auth and
  Postgres with row-level security, S3-compatible storage, provider API keys,
  and LibreOffice conversion all live on the server. Nothing in `backend/`
  should be bundled onto a laptop or phone.
- The right model for us is therefore legal-hermes's *remote gateway* mode,
  not its local-backend mode: a thin native shell that renders the hosted web
  app and authenticates with the existing HttpOnly cookie session.
- Recommended path, in order: a Progressive Web App baseline (days), a
  Tauri 2 desktop shell for macOS and Windows (weeks), then an iOS app built
  from the same Tauri project once the backend accepts a second client origin
  and the UI has been made phone-friendly.
- What we can lift from legal-hermes: the electron-builder and notarization
  configuration, the Electron hardening checklist, the "OAuth in a captive
  window, then reuse the cookie jar" pattern, the Windows signing CI workflow,
  and the installer runbook. What we should not lift: the Python bootstrap,
  the source-archive staging, node-pty, and the in-app self-update-by-git.

## What legal-hermes actually does

Source layout worth knowing (paths are in the legal-hermes repository):

| Path | Purpose |
| --- | --- |
| `apps/desktop/electron/main.cjs` | Electron main process (about 6,600 lines): boots the local Python backend, remote-gateway mode, OAuth window, IPC, self-update. |
| `apps/desktop/electron/hardening.cjs` | IPC path validation, sensitive-file blocklist, `safeStorage` encryption of tokens. |
| `apps/desktop/electron/connection-config.cjs` | Remote backend URL normalization, token vs OAuth auth modes, cookie liveness checks. |
| `apps/desktop/package.json` (`build` key) | electron-builder targets: DMG and ZIP on macOS with hardened runtime, NSIS and MSI on Windows, AppImage/deb/rpm on Linux. |
| `apps/desktop/scripts/notarize.cjs` | `notarytool` submission and stapling, driven by `APPLE_API_KEY*` or a keychain profile. |
| `apps/desktop/scripts/stage-native-deps.cjs` | Copies `node-pty` prebuilts into `extraResources` because the shell embeds a terminal. |
| `apps/bootstrap-installer/` | A separate **Tauri 2** app that drives `install.ps1`. Signed NSIS build in `.github/workflows/build-windows-installer.yml` using Azure Artifact Signing. |
| `docs/windows-installer-runbook.md` | Release checklist for non-technical Windows users. |

Key behaviors:

1. **The packaged app ships only the shell.** On first launch it downloads
   `uv`, Python 3.11, portable Git and Node into `~/.hermes` and installs the
   agent there. Everything the user does runs locally against their own model
   provider keys. This is why the app needs a terminal, file-system IPC, and
   a multi-stage setup overlay.
2. **Remote gateway mode** (`connection-config.cjs`, and the OAuth section of
   `main.cjs`) connects the same renderer to a hosted gateway instead. The
   OAuth variant opens a sandboxed `BrowserWindow` on the gateway's `/login`,
   watches the persistent session partition until the HttpOnly session cookie
   appears, then routes REST calls through Electron's `net` module bound to
   that partition so the cookie is attached automatically. This is the part
   that maps onto Accelerate Legal.
3. **Security posture** is good and worth copying: `contextIsolation: true`,
   `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`, permission
   request handlers on the default session, external links forced through
   `shell.openExternal`, tokens stored with `safeStorage`, and unit tests on
   every electron-free helper module.
4. **No mobile client exists.** The only iOS references are community user
   stories on the marketing site.

## Where Accelerate Legal stands today

| Concern | Current state | Impact on a native shell |
| --- | --- | --- |
| Rendering | Next.js 16 App Router. Every page under `frontend/src/app/(pages)/` is a client component; there are no server actions and no `next/headers` usage. | The UI is effectively a single-page app and renders fine inside any webview. |
| API access | Browsers call the same-origin `/api` gateway. `frontend/src/app/api/[...path]/route.ts` is a Node route handler that proxies to Express using `API_BASE_URL`. | A shell that loads the **hosted origin** needs no change. A shell that bundles the UI locally must either ship its own proxy or call the backend cross-origin. |
| Session | Backend-managed HttpOnly cookie, `__Host-` prefixed and `SameSite=Lax` in production (`backend/src/lib/authSession.ts`). The Word add-in origin gets `SameSite=None; Partitioned`. | Same-origin shells work unchanged. Cross-origin clients need the Word add-in cookie branch generalized, or a bearer-token mode. |
| CSRF guard | `backend/src/middleware/trustedOrigin.ts` rejects unsafe methods unless `Origin` matches `FRONTEND_URL`, `WORD_ADDIN_URL`, or `ALLOWED_ORIGINS`. | A Tauri or Capacitor origin such as `tauri://localhost` must be added to `ALLOWED_ORIGINS`. Electron loading the hosted URL sends the real origin. |
| Google OAuth | `GoogleAuthButton` does a full-page `window.location.assign` to the Supabase URL returned by `POST /api/auth/oauth`; the provider returns to `/auth/callback?code=`, which calls `POST /api/auth/exchange`. | Works inside an Electron or Tauri window loading the hosted origin. For a bundled-UI app the callback lands in the system browser, so the session must be handed back to the app. |
| Handoff tickets | `POST /api/auth/handoff` already exchanges a single-use, origin-bound, two-minute encrypted ticket for a cookie session (`backend/src/lib/authHandoff.ts`). Built for the Word add-in's Office dialog. | This is exactly the primitive a deep-link OAuth return needs. Only the origin check is Word-specific. |
| Second client precedent | `word-addin/` is a separate origin served by a small static-plus-proxy server (`word-addin/server.mjs`) and is tested in WebKit as well as Chromium. | Proves the backend can serve more than one client origin and that the shared UI runs in WebKit. |
| Layout | Desktop-first. The sidebar collapses under 768 px in the page shell, and a handful of shared components use `md:` breakpoints, but document viewers, tabular reviews, and the spreadsheet editor assume a wide screen. | Fine for macOS and Windows. Real work is needed before iPhone. |
| Installability | `frontend/public/` has `apple-touch-icon.png` but no web app manifest or service worker. | A PWA baseline is missing and cheap to add. |

## Options

### Option A: Progressive Web App

Add a `manifest.webmanifest`, maskable icons, a `theme-color`, and a minimal
service worker that caches the shell. Users can then install from Safari
("Add to Dock" on macOS, "Add to Home Screen" on iOS), Chrome, and Edge.

- Effort: one to three days. Zero backend change.
- Gains: an app icon and window on all three platforms, offline splash, the
  groundwork every other option benefits from.
- Limits: no App Store or Microsoft Store listing, no native menus or
  auto-update, Safari's PWA storage and push limits on iOS.

### Option B: Electron shell loading the hosted origin

Copy the legal-hermes shell, delete everything that exists to run a local
backend, and point `BrowserWindow.loadURL` at `https://app.accelerateai.io`
(or a per-deployment URL).

- Effort: two to four weeks including signing and CI.
- Gains: Chromium parity with our Playwright suite, the most battle-tested
  packaging story, easy reuse of legal-hermes's electron-builder config,
  `notarize.cjs`, entitlements, exe identity stamping, and hardening tests.
- Costs: 150 MB or more per install, Chromium security updates on our
  release cadence, no path to iOS.

### Option C: Tauri 2 shell loading the hosted origin (recommended)

Tauri 2 uses the platform webview (WKWebView on macOS and iOS, WebView2 on
Windows), builds to about 10 MB, and targets macOS, Windows, Linux, iOS, and
Android from one project. legal-hermes already uses it for its bootstrap
installer, so its toolchain is not foreign to a Hermes-style codebase.

- Effort: two to four weeks for macOS and Windows, comparable to Electron.
- Gains: one shell codebase reaches every platform the request names, small
  installers, memory footprint far below Electron, Rust-side plugins for
  deep links, updater, notifications, and secure storage.
- Costs: WebKit on macOS and iOS. The Word add-in already runs in WebKit,
  but the web app's e2e suite runs Chromium only, so a WebKit Playwright
  project should be added for `pdfjs-dist`, `docx-preview`,
  `@fortune-sheet/react`, and TipTap. Rust toolchain in CI.

### Option D: Bundle the UI inside the app (any framework)

Build the Next.js app as static assets and ship them inside the binary. This
is what App Store review prefers, and it is required for meaningful offline
behavior.

- Blocker today: the `/api/[...path]` proxy is a Node route handler, so a
  static export is not possible without moving API access to a configurable
  absolute base URL and enabling CORS with credentials on the backend.
- Consequence: cookies become cross-site, so the backend must issue
  `SameSite=None; Secure` cookies to the app origin (generalizing the Word
  add-in branch in `requestCookieOptions`) or accept a bearer token in
  `requireAuth`.
- Recommendation: defer until after Option C ships. The hosted-origin shell
  delivers most of the value without touching the auth model.

## Recommended plan

### Phase 0: PWA and responsive baseline

1. Add `frontend/public/manifest.webmanifest`, maskable icons, and a
   `theme-color` meta tag from the design tokens in
   `frontend/src/shared/ui/TokensUI.css`. Register the manifest in
   `frontend/src/app/layout.tsx` metadata.
2. Add a minimal service worker that caches the shell only. Never cache
   `/api` responses; the session cookie and row-level security make cached
   API bodies a data-leak risk between accounts on shared devices.
3. Audit the app shell for `env(safe-area-inset-*)`, touch-target size, and
   the sub-768 px states of `AppSidebar`, `PageHeader`, and `TableToolbar`.
   Update the matching skeletons at the same time, per `AGENTS.md`.

### Phase 1: `desktop/` package for macOS and Windows

1. Create a top-level `desktop/` directory (sibling of `frontend/`,
   `backend/`, and `word-addin/`) containing a Tauri 2 project whose main
   window loads the configured hosted origin. Keep `withGlobalTauri: false`,
   a strict CSP, and no file-system or shell capabilities beyond what is
   listed below.
2. Register a custom URL scheme (`accelerate://`) with the Tauri deep-link
   plugin. Use it only to focus the app and open a route, never to carry
   secrets, until Phase 2 needs it.
3. Force `target="_blank"` and external navigations through the opener
   plugin so the shell never navigates away from the app origin. legal-hermes
   `openExternalUrl` in `main.cjs` shows the edge cases (mailto, custom
   schemes, X11 fallbacks) that should become tests.
4. Wire the updater plugin against GitHub Releases with signed manifests.
5. Add native menus, a dock badge for running tabular reviews, and OS
   notifications for long-running workflow completion. These are the concrete
   reasons to prefer the desktop app over a browser tab.
6. CI: a `desktop.yml` workflow with a matrix of `macos-latest` and
   `windows-latest`. Sign and notarize on macOS using `APPLE_API_KEY`,
   `APPLE_API_KEY_ID`, and `APPLE_API_ISSUER`, mirroring
   `apps/desktop/scripts/notarize.cjs`. Sign on Windows using Azure Artifact
   Signing exactly as `build-windows-installer.yml` does in legal-hermes.
   Build on tags only; never sign a pull-request build.
7. Backend: no code change. Set nothing new in `ALLOWED_ORIGINS` because the
   shell presents the hosted origin.

If the team prefers Chromium consistency over installer size and the iOS
path, substitute Electron in step 1 and copy the legal-hermes `build` block,
`entitlements.mac.plist`, `notarize.cjs`, `after-pack.cjs`, and the
hardening tests. Drop `node-pty`, `stage-native-deps.cjs`,
`stage-source-archive.cjs`, `bootstrap-runner.cjs`, and the update-by-git
modules; they exist only to run a local agent.

### Phase 2: iOS

Apple rejects apps that are only a web page in a wrapper (App Store Review
Guideline 4.2, minimum functionality), so the iOS build must bundle the UI
and add native value. Sequence:

1. **Backend: second client origin.** Replace `requestOriginIsWordAddin`
   with a general `requestOriginIsCrossSiteClient` that reads a
   `CROSS_SITE_CLIENT_ORIGINS` list, and use it both in
   `requestCookieOptions` (to emit `SameSite=None; Secure; Partitioned`) and
   in the `/auth/handoff` origin check. Add the Tauri iOS origin to
   `ALLOWED_ORIGINS`. Add CORS with `credentials: true` for those origins
   only. Cover with route tests beside
   `backend/src/lib/__tests__/authSession.test.ts`.
2. **Frontend: configurable API base.** Make `API_BASE` in
   `frontend/src/app/lib/accelerateApi.ts` and the `/api/auth` prefix in
   `authApi.ts` resolve from a build-time public variable that defaults to
   `/api`, so the web build is unchanged and the bundled build points at the
   backend's public URL. Server-side rendering is not used, so the static
   export only needs the `/api/[...path]` route excluded from that build.
3. **OAuth return by deep link.** Sign in with Google opens the system
   browser. `/auth/callback` on the web origin, when it sees a
   `client=ios` marker, mints a handoff ticket (the existing
   `createAuthHandoff` path used by the Word add-in) and redirects to
   `accelerate://auth?ticket=…&requestId=…`. The app posts the ticket to
   `/api/auth/handoff` from its own origin and receives the cookie. Tickets
   are single-use, two minutes, and origin-bound, so this is no weaker than
   the add-in flow.
4. **Native value for review.** Share extension ("Send to Accelerate
   Legal" from Mail and Files), Files app integration for uploads, Face ID
   or passcode lock on resume, push notifications for workflow and tabular
   review completion, and offline reading of recently opened documents.
5. **UI scope.** Ship chat, document review with citations, project and
   library browsing, and workflow launching. Keep the spreadsheet editor and
   tabular review grid desktop-only at first; they do not fit a phone.
6. **Testing.** Add a WebKit project to the root `playwright.config.ts` and
   an iPhone viewport project for the mobile routes. Run the add-in's
   existing WebKit suite as the compatibility canary for shared UI.

### Cross-cutting rules

- Never bundle the backend, service-role key, storage credentials, or model
  provider keys into any client. The desktop and mobile apps are clients of
  the hosted API, exactly as the browser is.
- Keep `frontend/src/shared/ui/` as the layer that must render in the web
  app, the Word add-in, and any new shell. Feature code that needs a native
  bridge belongs behind a small adapter in `frontend/src/app/lib/`, with a
  browser fallback, so the web build never imports Tauri or Electron.
- Distribute through signed installers only. Unsigned ZIPs are for internal
  testing, as legal-hermes's own runbook states.

## Verification for this document

This change adds documentation only. No build or test commands were run.
