'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { setupAutoUpdates } = require('./updater.cjs')

function fakeUpdater(overrides = {}) {
  const listeners = {}
  return {
    listeners,
    on: (event, fn) => {
      listeners[event] = fn
    },
    checkForUpdatesAndNotify: overrides.checkForUpdatesAndNotify || (async () => null),
    checkForUpdates:
      overrides.checkForUpdates || (async () => ({ isUpdateAvailable: false, updateInfo: { version: '0.1.0' } }))
  }
}

test('disabled updater is inert', async () => {
  const updates = setupAutoUpdates({ autoUpdater: fakeUpdater(), log: () => {}, enabled: false })
  assert.equal(updates.enabled, false)
  assert.deepEqual(await updates.checkNow(), { status: 'disabled' })
})

test('enabled updater schedules background checks and reports manual results', async () => {
  const logs = []
  const scheduled = []
  const updater = fakeUpdater({
    checkForUpdates: async () => ({ isUpdateAvailable: true, updateInfo: { version: '0.2.0' } })
  })
  const updates = setupAutoUpdates({
    autoUpdater: updater,
    log: (...args) => logs.push(args),
    enabled: true,
    setTimer: fn => scheduled.push(fn),
    setInterval: fn => scheduled.push(fn)
  })
  assert.equal(updates.enabled, true)
  assert.equal(updater.autoDownload, true)
  assert.equal(scheduled.length, 2)
  assert.deepEqual(await updates.checkNow(), { status: 'available', version: '0.2.0' })
  updater.listeners.error(new Error('no signature'))
  assert.equal(logs.at(-1)[1], 'update check failed')
})

test('manual check failures become a status, never a throw', async () => {
  const updater = fakeUpdater({
    checkForUpdates: async () => {
      throw new Error('offline')
    }
  })
  const updates = setupAutoUpdates({
    autoUpdater: updater,
    log: () => {},
    enabled: true,
    setTimer: () => null,
    setInterval: () => null
  })
  assert.deepEqual(await updates.checkNow(), { status: 'error' })
})

test('background check rejections are logged and swallowed', async () => {
  const logs = []
  let run
  const updater = fakeUpdater({
    checkForUpdatesAndNotify: async () => {
      throw new Error('feed unavailable')
    }
  })
  setupAutoUpdates({
    autoUpdater: updater,
    log: (...args) => logs.push(args),
    enabled: true,
    setTimer: fn => {
      run = fn
    },
    setInterval: () => null
  })
  run()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(logs.at(-1)[1], 'background update check failed')
})
