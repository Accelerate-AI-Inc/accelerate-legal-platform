/**
 * End-to-end smoke test for the desktop shell, driven through Playwright's
 * Electron support (from the repository root's `npm ci`). It starts a fake
 * Accelerate Legal server, launches the app against a throwaway data
 * directory, and checks the first-run flow:
 *
 *   1. the connect screen appears and rejects a bad address;
 *   2. connecting to the fake server loads it in the window;
 *   3. the page sees `window.accelerateDesktop` with `signInWithGoogle`;
 *   4. an off-origin link does not navigate the window;
 *   5. the server URL is persisted for the next launch.
 *
 * Usage (Linux CI needs a display: `xvfb-run -a node scripts/smoke.mjs`):
 *   node scripts/smoke.mjs
 */
import http from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const desktopRoot = path.resolve(here, '..')
const repoRoot = path.resolve(desktopRoot, '..')
const requireFromRoot = createRequire(path.join(repoRoot, 'package.json'))
const requireFromDesktop = createRequire(path.join(desktopRoot, 'package.json'))
const { _electron: electron } = requireFromRoot('@playwright/test')
// Playwright resolves `electron` from its own location; point it at ours.
const electronBinary = requireFromDesktop('electron')

function assert(condition, message) {
  if (!condition) throw new Error(`smoke: ${message}`)
}

const server = http.createServer((req, res) => {
  if (req.url === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
    return
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end(`<!doctype html><title>Fake Accelerate Legal</title>
    <h1 id="title">Fake Accelerate Legal</h1>
    <a id="external" href="https://example.com/elsewhere">external</a>
    <a id="internal" href="/assistant">internal</a>
    <p id="ua"></p>
    <script>document.getElementById('ua').textContent = navigator.userAgent</script>`)
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const fakeOrigin = `http://127.0.0.1:${server.address().port}`
const userData = await mkdtemp(path.join(os.tmpdir(), 'accelerate-desktop-smoke-'))

let app
try {
  app = await electron.launch({
    executablePath: electronBinary,
    args: [desktopRoot],
    env: { ...process.env, ACCELERATE_DESKTOP_USER_DATA_DIR: userData, ACCELERATE_DESKTOP_DISABLE_UPDATES: '1' }
  })
  const window = await app.firstWindow()

  // 1. Connect screen, bad address rejected.
  await window.waitForSelector('#connect-form')
  assert((await window.title()) === 'Connect to Accelerate Legal', 'connect page should show first')
  const placeholder = await window.getAttribute('#server-url', 'placeholder')
  assert(placeholder === 'https://app.accelerateai.io', `default placeholder, got ${placeholder}`)
  await window.fill('#server-url', 'http://not-loopback.example')
  await window.click('#connect')
  await window.waitForFunction(() => document.getElementById('error').textContent.length > 0)
  const error = await window.textContent('#error')
  assert(/https:\/\//.test(error), `plain http to a remote host must be rejected, got: ${error}`)

  // 2. Connect to the fake server; the app replaces its window.
  await window.fill('#server-url', fakeOrigin)
  await window.click('#connect')
  const appWindow = await app.waitForEvent('window', { timeout: 15000 })
  await appWindow.waitForSelector('#title')
  assert((await appWindow.url()).startsWith(`${fakeOrigin}/`), `app window should load the server, got ${await appWindow.url()}`)

  // 3. Bridge is exposed to the server origin only.
  const bridge = await appWindow.evaluate(() => ({
    present: typeof window.accelerateDesktop === 'object' && window.accelerateDesktop !== null,
    signIn: typeof (window.accelerateDesktop && window.accelerateDesktop.signInWithGoogle),
    setup: typeof window.accelerateDesktopSetup,
    platform: window.accelerateDesktop && window.accelerateDesktop.platform
  }))
  assert(bridge.present && bridge.signIn === 'function', 'window.accelerateDesktop.signInWithGoogle missing')
  assert(bridge.setup === 'undefined', 'setup bridge must not leak to the app origin')
  assert(bridge.platform === process.platform, 'platform mismatch')
  const ua = await appWindow.textContent('#ua')
  assert(/AccelerateLegalDesktop\//.test(ua), `user agent should carry the desktop token, got ${ua}`)

  // 4. Same-origin links navigate; off-origin navigation is not followed.
  await appWindow.evaluate(() => document.getElementById('internal').click())
  await appWindow.waitForURL(`${fakeOrigin}/assistant`)
  await appWindow.evaluate(() => {
    window.location.assign('https://example.com/elsewhere')
  })
  await appWindow.waitForTimeout(1500)
  assert((await appWindow.url()).startsWith(fakeOrigin), 'external navigation must stay out of the window')
  assert((await appWindow.textContent('#title')) === 'Fake Accelerate Legal', 'window content must be untouched')

  // 5. Persisted configuration.
  const config = JSON.parse(await readFile(path.join(userData, 'config.json'), 'utf8'))
  assert(config.serverUrl === fakeOrigin, `serverUrl should persist, got ${config.serverUrl}`)

  console.log('smoke: all checks passed')
} finally {
  if (app) await app.close().catch(() => {})
  server.close()
  await rm(userData, { recursive: true, force: true })
}
