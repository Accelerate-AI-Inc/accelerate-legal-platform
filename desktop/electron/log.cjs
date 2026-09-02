'use strict'

const fs = require('node:fs')
const path = require('node:path')

/**
 * Tiny append-only JSON-lines logger. Boot problems on a user's Mac are only
 * diagnosable from this file, so it must never throw and must never include
 * request bodies, cookies, or tickets: callers pass short summaries only.
 */
function createLogger(filePath) {
  let ready = false
  function ensureDir() {
    if (ready) return
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    ready = true
  }
  return function log(level, message, meta) {
    const entry = { ts: new Date().toISOString(), level, message, ...(meta || {}) }
    const line = JSON.stringify(entry)
    if (level === 'error' || level === 'warn') console.error(`[desktop] ${line}`)
    else console.log(`[desktop] ${line}`)
    try {
      ensureDir()
      fs.appendFileSync(filePath, `${line}\n`)
    } catch {
      // Logging must never take the app down.
    }
  }
}

module.exports = { createLogger }
