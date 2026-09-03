'use strict'

/**
 * Server address handling for the connect screen. Pure and electron-free so
 * it can be unit-tested with `node --test`.
 */

const DEFAULT_SERVER_URL = 'https://app.accelerateai.io'

function isLoopbackHost(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '')
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.localhost')
}

/**
 * Normalize user input to an origin. HTTPS is required except for loopback
 * development servers: the production session cookie carries the `__Host-`
 * prefix, which browsers only accept over HTTPS, so a plain-HTTP remote
 * server could never keep the user signed in.
 */
function normalizeServerUrl(input) {
  let value = String(input || '').trim()
  if (!value) throw new Error('Enter the address of your Accelerate Legal server.')
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `https://${value}`

  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new Error('That does not look like a valid web address.')
  }
  if (parsed.username || parsed.password) {
    throw new Error('The server address must not include a username or password.')
  }
  if (parsed.protocol === 'http:') {
    if (!isLoopbackHost(parsed.hostname)) {
      throw new Error('The server address must use https:// (http:// is only allowed for localhost).')
    }
  } else if (parsed.protocol !== 'https:') {
    throw new Error('The server address must start with https://.')
  }
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new Error('Enter just the server address, without a path (for example https://app.accelerateai.io).')
  }
  return parsed.origin
}

/**
 * Interpret the response of `GET {origin}/api/health`, which the web
 * frontend proxies to the Express backend's `/health`.
 */
function interpretHealthResponse(status, body) {
  if (status < 200 || status >= 300) {
    return { ok: false, message: `The server responded with HTTP ${status}. Check the address and try again.` }
  }
  if (!body || typeof body !== 'object' || body.ok !== true) {
    return { ok: false, message: 'That address does not look like an Accelerate Legal server.' }
  }
  return { ok: true }
}

module.exports = { DEFAULT_SERVER_URL, interpretHealthResponse, isLoopbackHost, normalizeServerUrl }
