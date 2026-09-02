'use strict'

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000

/**
 * Tracks the one in-flight desktop sign-in. The renderer asks to sign in, the
 * system browser does the work, and the deep link brings back a ticket that
 * is only redeemable together with the request id kept here. A new attempt
 * supersedes the previous one; an attempt that never returns times out.
 */
function createDesktopSignIn({ randomId, timeoutMs = DEFAULT_TIMEOUT_MS, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  if (typeof randomId !== 'function') throw new Error('randomId is required')
  let pending = null

  function settle(outcome) {
    if (!pending) return false
    const current = pending
    pending = null
    clearTimer(current.timer)
    if (outcome.error) current.reject(outcome.error)
    else current.resolve(outcome.value)
    return true
  }

  return {
    begin() {
      settle({ error: new Error('A newer sign-in attempt replaced this one.') })
      const requestId = randomId()
      let resolve
      let reject
      const promise = new Promise((res, rej) => {
        resolve = res
        reject = rej
      })
      const timer = setTimer(() => {
        settle({ error: new Error('Sign-in timed out. Please try again.') })
      }, timeoutMs)
      if (timer && typeof timer.unref === 'function') timer.unref()
      pending = { requestId, resolve, reject, timer }
      return { requestId, promise }
    },
    complete(ticket) {
      if (!pending) return false
      return settle({ value: { ticket, requestId: pending.requestId } })
    },
    fail(message) {
      return settle({ error: new Error(message || 'Sign-in could not be completed.') })
    },
    cancel() {
      return settle({ error: new Error('Sign-in was cancelled.') })
    },
    get pendingRequestId() {
      return pending ? pending.requestId : null
    }
  }
}

module.exports = { createDesktopSignIn, DEFAULT_TIMEOUT_MS }
