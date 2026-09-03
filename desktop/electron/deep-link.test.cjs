'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { extractDeepLinkFromArgv, parseDeepLink } = require('./deep-link.cjs')

const TICKET = 'a'.repeat(43)

test('auth deep link carries a well-formed ticket', () => {
  assert.deepEqual(parseDeepLink(`accelerate-legal://auth?ticket=${TICKET}`), { kind: 'auth', ticket: TICKET })
  assert.deepEqual(parseDeepLink(`accelerate-legal:///auth?ticket=${TICKET}`), { kind: 'auth', ticket: TICKET })
})

test('malformed tickets are ignored rather than redeemed', () => {
  assert.equal(parseDeepLink('accelerate-legal://auth?ticket=short'), null)
  assert.equal(parseDeepLink('accelerate-legal://auth?ticket=' + 'x'.repeat(300)), null)
  assert.equal(parseDeepLink('accelerate-legal://auth?ticket=has%20space' + 'x'.repeat(40)), null)
  assert.equal(parseDeepLink('accelerate-legal://auth'), null)
})

test('auth errors are passed through, truncated', () => {
  assert.deepEqual(parseDeepLink('accelerate-legal://auth?error=Cancelled'), { kind: 'auth-error', message: 'Cancelled' })
  assert.equal(parseDeepLink('accelerate-legal://auth?error=' + 'e'.repeat(500)).message.length, 200)
})

test('open links only accept safe in-app paths', () => {
  assert.deepEqual(parseDeepLink('accelerate-legal://open?path=/projects?tab=recent'), {
    kind: 'open',
    path: '/projects?tab=recent'
  })
  assert.deepEqual(parseDeepLink('accelerate-legal://open'), { kind: 'open', path: '/' })
  assert.equal(parseDeepLink('accelerate-legal://open?path=//evil.example'), null)
  assert.equal(parseDeepLink('accelerate-legal://open?path=https://evil.example'), null)
  assert.equal(parseDeepLink('accelerate-legal://open?path=/a%0Ab'), null)
  assert.equal(parseDeepLink('accelerate-legal://open?path=/a%5Cb'), null)
})

test('other schemes and actions are ignored', () => {
  assert.equal(parseDeepLink('https://app.example.test/auth?ticket=' + TICKET), null)
  assert.equal(parseDeepLink('accelerate-legal://settings'), null)
  assert.equal(parseDeepLink('nonsense'), null)
  assert.equal(parseDeepLink(undefined), null)
})

test('argv scan finds the deep link among other flags', () => {
  assert.equal(extractDeepLinkFromArgv(['/app', '--flag', 'accelerate-legal://open']), 'accelerate-legal://open')
  assert.equal(extractDeepLinkFromArgv(['/app']), null)
  assert.equal(extractDeepLinkFromArgv(undefined), null)
})
