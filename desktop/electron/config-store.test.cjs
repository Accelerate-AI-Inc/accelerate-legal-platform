'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { createConfigStore } = require('./config-store.cjs')

function tempFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'accelerate-desktop-'))
  return path.join(dir, 'nested', 'config.json')
}

test('missing file reads as empty and set creates parent directories', () => {
  const file = tempFile()
  const store = createConfigStore(file)
  assert.equal(store.get('serverUrl'), undefined)
  store.set('serverUrl', 'https://app.example.test')
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).serverUrl, 'https://app.example.test')
  assert.deepEqual(store.all(), { serverUrl: 'https://app.example.test' })
})

test('corrupt or non-object content is treated as empty instead of crashing', () => {
  const file = tempFile()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, '{not json')
  assert.deepEqual(createConfigStore(file).all(), {})
  fs.writeFileSync(file, '[1,2]')
  assert.deepEqual(createConfigStore(file).all(), {})
})

test('setting undefined removes the key', () => {
  const store = createConfigStore(tempFile())
  store.set('windowBounds', { width: 1, height: 2 })
  store.set('windowBounds', undefined)
  assert.equal(store.get('windowBounds'), undefined)
})
