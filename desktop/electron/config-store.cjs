'use strict'

const fs = require('node:fs')
const path = require('node:path')

/**
 * Minimal JSON settings file under Electron's userData directory. Holds the
 * server URL and window bounds only; the session cookie lives in Chromium's
 * cookie jar, never here.
 */
function createConfigStore(filePath) {
  let cache = null

  function read() {
    if (cache) return cache
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      cache = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      cache = {}
    }
    return cache
  }

  function write(next) {
    cache = next
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    const tmp = `${filePath}.tmp`
    fs.writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`)
    fs.renameSync(tmp, filePath)
  }

  return {
    get(key) {
      return read()[key]
    },
    set(key, value) {
      const next = { ...read() }
      if (value === undefined) delete next[key]
      else next[key] = value
      write(next)
    },
    all() {
      return { ...read() }
    }
  }
}

module.exports = { createConfigStore }
