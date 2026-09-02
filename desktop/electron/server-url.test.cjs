'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { DEFAULT_SERVER_URL, interpretHealthResponse, normalizeServerUrl } = require('./server-url.cjs')

test('default is the hosted app over https', () => {
  assert.equal(normalizeServerUrl(DEFAULT_SERVER_URL), 'https://app.accelerateai.io')
})

test('adds https and strips trailing slashes, ports are kept', () => {
  assert.equal(normalizeServerUrl(' app.example.test '), 'https://app.example.test')
  assert.equal(normalizeServerUrl('https://app.example.test/'), 'https://app.example.test')
  assert.equal(normalizeServerUrl('https://app.example.test:8443'), 'https://app.example.test:8443')
})

test('plain http is only accepted for loopback development servers', () => {
  assert.equal(normalizeServerUrl('http://localhost:3000'), 'http://localhost:3000')
  assert.equal(normalizeServerUrl('http://127.0.0.1:3000/'), 'http://127.0.0.1:3000')
  assert.equal(normalizeServerUrl('http://legal.localhost:3000'), 'http://legal.localhost:3000')
  assert.throws(() => normalizeServerUrl('http://app.example.test'), /https:\/\//)
})

test('rejects credentials, paths, other schemes, and garbage', () => {
  assert.throws(() => normalizeServerUrl(''), /Enter the address/)
  assert.throws(() => normalizeServerUrl('https://user:pw@app.example.test'), /username or password/)
  assert.throws(() => normalizeServerUrl('https://app.example.test/assistant'), /without a path/)
  assert.throws(() => normalizeServerUrl('ftp://app.example.test'), /https:\/\//)
  assert.throws(() => normalizeServerUrl('file:///etc/passwd'), /https:\/\//)
  assert.throws(() => normalizeServerUrl('https://'), /valid web address/)
})

test('health probe requires a 2xx JSON body with ok:true', () => {
  assert.deepEqual(interpretHealthResponse(200, { ok: true }), { ok: true })
  assert.match(interpretHealthResponse(404, null).message, /HTTP 404/)
  assert.match(interpretHealthResponse(200, { hello: 'world' }).message, /does not look like/)
  assert.match(interpretHealthResponse(200, 'ok').message, /does not look like/)
})
