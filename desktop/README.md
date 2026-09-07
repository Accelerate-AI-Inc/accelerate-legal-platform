# Accelerate Legal for macOS

A native macOS app for Accelerate Legal. It renders the hosted web app in an
Electron window and adds what a browser tab cannot: a Dock icon and menu bar,
a remembered window, `accelerate-legal://` deep links, sign-in through the
system browser, and background updates.

The app is a client of the hosted API, exactly like the browser. It contains
no backend code, no database credentials, and no model-provider keys.

## Install

Download `Accelerate-Legal-<version>-mac-arm64.dmg` (Apple silicon) or
`Accelerate-Legal-<version>-mac-x64.dmg` (Intel) from the project's GitHub
Releases, open it, and drag Accelerate Legal to Applications.

On first launch the app asks which server to use. Keep the default
`https://app.accelerateai.io` unless your firm runs its own Accelerate Legal
server, in which case enter its address. Change it later from
**Accelerate Legal › Change Server…** (⌘,).

## Signing in

Email and password sign-in happens inside the app.

**Continue with Google** opens your default browser instead. Google does not
allow its sign-in inside embedded windows, so the browser completes the
sign-in, then hands a short-lived, single-use ticket back to the app over the
`accelerate-legal://` link. The app redeems the ticket together with a request
id that never left the app, so an intercepted link cannot be used elsewhere.
Tickets expire after two minutes.

For self-hosted servers this requires `AUTH_HANDOFF_ENCRYPTION_SECRET` in the
backend environment and the `auth_handoff_tickets` migration, the same
prerequisites as the Word add-in. Without them the browser page reports that
desktop sign-in is not enabled and email sign-in still works.

## What the shell does

| Concern | Behaviour |
| --- | --- |
| Navigation | Only the configured server origin renders in the window. Other web links open in the default browser; non-web schemes are blocked. |
| Permissions | Notifications, fullscreen, and clipboard are allowed for the server origin. Camera, microphone, location, and everything else are denied without prompting. |
| Session | Kept in Chromium's cookie jar under the app's data directory. Changing server clears it. |
| Offline | A local page with **Try again** and **Change server…** replaces a failed load. |
| Updates | Signed builds check GitHub Releases on launch and every six hours, download in the background, and install on quit. **Check for Updates…** in the app menu forces a check. Unsigned builds skip updates. |
| Logs | `~/Library/Application Support/Accelerate Legal/logs/desktop.log`, also reachable from **Help › Open Log Folder**. No request bodies, cookies, or tickets are logged. |

Deep links:

```text
accelerate-legal://auth?ticket=<ticket>     sign-in handoff (used by /auth/desktop)
accelerate-legal://open?path=/projects      focus the app on an in-app route
```

## Development

```bash
cd desktop
npm install
npm run dev                # launches against the stored server (or the connect screen)
ACCELERATE_DESKTOP_SERVER_URL=http://localhost:3000 npm run dev   # local stack
```

`npm run dev` enables the View › Toggle Developer Tools item. The web app is
never bundled: point the shell at a running frontend, local or hosted.

Checks:

```bash
npm run check   # syntax-check main, preload, and setup pages
npm test        # node --test for the electron-free helper modules
```

Everything electron-free lives in its own module with a `*.test.cjs`
neighbour: server URL rules, navigation policy, deep-link parsing, the
sign-in state machine, window bounds, the menu template, the updater wrapper,
and the config store. `electron/main.cjs` only wires them to Electron.

Regenerate the icon after changing the brand mark:

```bash
npm ci                   # at the repository root, for Playwright
cd desktop && npm run icon
```

## Building installers

```bash
npm run dist:mac         # DMG + ZIP for arm64 and x64 into desktop/release/
npm run dist:mac:dmg
npm run pack             # unpacked .app only
```

Signing and notarization run automatically when these environment variables
are set: `CSC_LINK` and `CSC_KEY_PASSWORD` (Developer ID Application
certificate), plus `APPLE_API_KEY`, `APPLE_API_KEY_ID`, and `APPLE_API_ISSUER`
(App Store Connect API key).

This repository ships no CI workflows, so release builds are made on a Mac with
those variables exported. Attach the whole contents of `desktop/release/` to the
GitHub Release — the `.dmg` and `.zip` files, the `.blockmap` files, and
`latest-mac.yml` — because installed copies read `latest-mac.yml` to discover
updates and will not update without it.

Set `ACCELERATE_DESKTOP_DISABLE_UPDATES=1` to run a packaged build without
update checks.

## Security notes

- Renderer: `contextIsolation`, `sandbox`, `nodeIntegration: false`,
  `webSecurity: true`; `<webview>` is blocked.
- The preload exposes exactly two bridges: the connect and offline pages get
  `connect`, `retry`, and `changeServer`; the server origin gets
  `window.accelerateDesktop` with `platform`, `version`, and
  `signInWithGoogle`. Every IPC handler re-checks the calling frame's origin.
- Local pages ship a `default-src 'none'` content security policy.
- Hardened runtime with only the JIT entitlements Chromium requires.
