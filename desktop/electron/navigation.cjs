'use strict'

/**
 * Where may the window go? Only the configured server origin renders inside
 * the app. Everything else on the web opens in the user's default browser,
 * and non-web schemes are dropped outright.
 */
function classifyNavigation(rawUrl, serverOrigin) {
  let parsed
  try {
    parsed = new URL(String(rawUrl))
  } catch {
    return 'blocked'
  }
  if (serverOrigin && parsed.origin === serverOrigin) return 'app'
  if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') {
    return 'external'
  }
  return 'blocked'
}

// Chromium permissions the web app legitimately uses. Anything not listed
// (camera, microphone, geolocation, MIDI, USB, ...) is denied without a prompt.
const ALLOWED_PERMISSIONS = new Set(['notifications', 'fullscreen', 'clipboard-sanitized-write', 'clipboard-read'])

function isAllowedPermission(permission) {
  return ALLOWED_PERMISSIONS.has(String(permission))
}

module.exports = { classifyNavigation, isAllowedPermission }
