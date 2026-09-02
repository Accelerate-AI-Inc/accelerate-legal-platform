'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { LINKS, buildMenuTemplate } = require('./menu.cjs')

function labels(menu) {
  return menu.submenu.filter(item => item.label).map(item => item.label)
}

function build(overrides = {}) {
  const calls = []
  const actions = new Proxy({}, { get: (_t, name) => (...args) => calls.push([name, ...args]) })
  const template = buildMenuTemplate({ isMac: true, isDev: false, appName: 'Accelerate Legal', actions, ...overrides })
  return { template, calls }
}

test('mac template leads with the app menu and exposes server and update actions', () => {
  const { template, calls } = build()
  assert.equal(template[0].label, 'Accelerate Legal')
  const appLabels = labels(template[0])
  assert.ok(appLabels.includes('Change Server…'))
  assert.ok(appLabels.includes('Check for Updates…'))
  template[0].submenu.find(i => i.label === 'Change Server…').click()
  template[0].submenu.find(i => i.label === 'Check for Updates…').click()
  assert.deepEqual(calls, [['changeServer'], ['checkForUpdates']])
})

test('dev tools only appear in development builds', () => {
  const view = build({ isDev: false }).template.find(m => m.label === 'View')
  assert.ok(!view.submenu.some(i => i.role === 'toggleDevTools'))
  const devView = build({ isDev: true }).template.find(m => m.label === 'View')
  assert.ok(devView.submenu.some(i => i.role === 'toggleDevTools'))
})

test('help links open externally through the injected action', () => {
  const { template, calls } = build()
  const help = template.find(m => m.role === 'help')
  help.submenu.find(i => i.label === 'Documentation').click()
  help.submenu.find(i => i.label === 'Report an Issue…').click()
  help.submenu.find(i => i.label === 'Open Log Folder').click()
  assert.deepEqual(calls, [['openExternal', LINKS.docs], ['openExternal', LINKS.issues], ['openLogs']])
})

test('non-mac template omits the app menu and quits from File', () => {
  const { template } = build({ isMac: false })
  assert.equal(template[0].label, 'File')
  assert.ok(template[0].submenu.some(i => i.role === 'quit'))
})
