'use strict'

const DEFAULT_BOUNDS = { width: 1280, height: 840 }
const MIN_WIDTH = 900
const MIN_HEIGHT = 600

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

/**
 * Restore saved window bounds only if they still land on a connected display;
 * a window remembered on an unplugged monitor must not open off-screen.
 */
function restoreWindowBounds(saved, displays) {
  const size = {
    width: Math.max(MIN_WIDTH, Number(saved && saved.width) || DEFAULT_BOUNDS.width),
    height: Math.max(MIN_HEIGHT, Number(saved && saved.height) || DEFAULT_BOUNDS.height)
  }
  if (!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return size
  const candidate = { x: saved.x, y: saved.y, ...size }
  const visible = (displays || []).some(display => display && display.workArea && intersects(candidate, display.workArea))
  return visible ? candidate : size
}

module.exports = { DEFAULT_BOUNDS, MIN_HEIGHT, MIN_WIDTH, restoreWindowBounds }
