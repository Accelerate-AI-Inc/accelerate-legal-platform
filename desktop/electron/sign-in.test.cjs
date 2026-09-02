'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { createDesktopSignIn } = require('./sign-in.cjs')

function fakeTimers() {
  const timers = []
  return {
    timers,
    setTimer: (fn, ms) => {
      const handle = { fn, ms, cleared: false }
      timers.push(handle)
      return handle
    },
    clearTimer: handle => {
      if (handle) handle.cleared = true
    }
  }
}

function make() {
  let n = 0
  const t = fakeTimers()
  const signIn = createDesktopSignIn({ randomId: () => `request-${++n}`.padEnd(32, '0'), ...t })
  return { signIn, ...t }
}

test('completing returns the ticket with the request id the app generated', async () => {
  const { signIn } = make()
  const attempt = signIn.begin()
  assert.equal(signIn.pendingRequestId, attempt.requestId)
  assert.equal(signIn.complete('ticket-1'), true)
  assert.deepEqual(await attempt.promise, { ticket: 'ticket-1', requestId: attempt.requestId })
  assert.equal(signIn.pendingRequestId, null)
})

test('a ticket with no pending attempt is ignored', () => {
  const { signIn } = make()
  assert.equal(signIn.complete('ticket'), false)
  assert.equal(signIn.fail('x'), false)
})

test('a newer attempt supersedes the previous one', async () => {
  const { signIn, timers } = make()
  const first = signIn.begin()
  const second = signIn.begin()
  await assert.rejects(first.promise, /newer sign-in attempt/)
  assert.equal(timers[0].cleared, true)
  signIn.complete('t2')
  assert.equal((await second.promise).requestId, second.requestId)
  assert.notEqual(first.requestId, second.requestId)
})

test('failure and cancel reject with a user-facing message', async () => {
  const { signIn } = make()
  const a = signIn.begin()
  signIn.fail('The browser reported an error.')
  await assert.rejects(a.promise, /browser reported/)
  const b = signIn.begin()
  signIn.cancel()
  await assert.rejects(b.promise, /cancelled/)
})

test('an abandoned attempt times out', async () => {
  const { signIn, timers } = make()
  const attempt = signIn.begin()
  assert.equal(timers.length, 1)
  timers[0].fn()
  await assert.rejects(attempt.promise, /timed out/)
  assert.equal(signIn.pendingRequestId, null)
})

test('randomId is mandatory', () => {
  assert.throws(() => createDesktopSignIn({}), /randomId/)
})
