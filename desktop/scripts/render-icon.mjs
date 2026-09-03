/**
 * Render assets/icon.png (1024x1024) from the web app's brand mark.
 *
 * Uses the repository root's Playwright install (run `npm ci` at the repo
 * root first). macOS icons sit on a rounded square that fills ~80% of the
 * canvas with transparent margins; electron-builder converts the PNG to
 * .icns at build time.
 */
import { createRequire } from 'node:module'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const requireFromRoot = createRequire(path.join(repoRoot, 'package.json'))
const { chromium } = requireFromRoot('@playwright/test')

const SIZE = 1024
const TILE = 824
const RADIUS = Math.round(TILE * 0.2237)
const GLYPH_SCALE = TILE / 32

const markSvg = await readFile(path.join(repoRoot, 'frontend', 'src', 'app', 'icon.svg'), 'utf8')
const glyph = markSvg.slice(markSvg.indexOf('<g '), markSvg.lastIndexOf('</g>') + 4)

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
  <g transform="translate(${(SIZE - TILE) / 2} ${(SIZE - TILE) / 2})">
    <rect width="${TILE}" height="${TILE}" rx="${RADIUS}" fill="#faf8f5" />
    <rect x="1.5" y="1.5" width="${TILE - 3}" height="${TILE - 3}" rx="${RADIUS - 1}" fill="none" stroke="rgba(23,24,28,0.12)" stroke-width="3" />
    <g transform="scale(${GLYPH_SCALE})">${glyph}</g>
  </g>
</svg>`

const html = `<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`
// Some CI images pre-install Chromium outside Playwright's cache; point
// PLAYWRIGHT_CHROMIUM_EXECUTABLE at it instead of downloading a browser.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined
const browser = await chromium.launch({ executablePath })
try {
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 })
  await page.setContent(html)
  const png = await page.locator('svg').screenshot({ omitBackground: true, type: 'png' })
  await mkdir(path.join(here, '..', 'assets'), { recursive: true })
  const out = path.join(here, '..', 'assets', 'icon.png')
  await writeFile(out, png)
  console.log(`wrote ${path.relative(repoRoot, out)} (${png.length} bytes)`)
} finally {
  await browser.close()
}
