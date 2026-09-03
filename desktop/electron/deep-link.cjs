'use strict'

const PROTOCOL_SCHEME = 'accelerate-legal'
const TICKET_PATTERN = /^[A-Za-z0-9_-]{32,256}$/

function hasControlCharacters(value) {
  for (const ch of value) {
    const code = ch.charCodeAt(0)
    if (code < 32 || code === 127) return true
  }
  return false
}

function safeAppPath(candidate) {
  const value = String(candidate || '')
  if (!value.startsWith('/') || value.startsWith('//')) return null
  if (value.includes('\\') || hasControlCharacters(value)) return null
  try {
    const resolved = new URL(value, 'https://deep-link.invalid')
    if (resolved.origin !== 'https://deep-link.invalid') return null
    return `${resolved.pathname}${resolved.search}`
  } catch {
    return null
  }
}

/**
 * Parse an `accelerate-legal://` URL delivered by macOS.
 *
 *   accelerate-legal://auth?ticket=<ticket>      sign-in handoff succeeded
 *   accelerate-legal://auth?error=<message>      sign-in handoff failed
 *   accelerate-legal://open?path=/assistant      focus the app on a route
 *
 * Anything else, including a malformed ticket, is ignored (`null`).
 */
function parseDeepLink(rawUrl) {
  let parsed
  try {
    parsed = new URL(String(rawUrl))
  } catch {
    return null
  }
  if (parsed.protocol !== `${PROTOCOL_SCHEME}:`) return null
  const action = parsed.hostname || parsed.pathname.replace(/^\/+/, '').split('/')[0]

  if (action === 'auth') {
    const ticket = parsed.searchParams.get('ticket')
    if (ticket && TICKET_PATTERN.test(ticket)) return { kind: 'auth', ticket }
    const error = parsed.searchParams.get('error')
    if (error) return { kind: 'auth-error', message: error.slice(0, 200) }
    return null
  }
  if (action === 'open') {
    const path = safeAppPath(parsed.searchParams.get('path') || '/')
    return path ? { kind: 'open', path } : null
  }
  return null
}

/** First deep link among process arguments (second-instance launches). */
function extractDeepLinkFromArgv(argv) {
  return (argv || []).find(arg => typeof arg === 'string' && arg.startsWith(`${PROTOCOL_SCHEME}://`)) || null
}

module.exports = { PROTOCOL_SCHEME, extractDeepLinkFromArgv, parseDeepLink }
