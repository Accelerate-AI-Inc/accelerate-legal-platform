'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { classifyNavigation, isAllowedPermission } = require('./navigation.cjs')

const APP = 'https://app.example.test'

test('same-origin navigation stays in the app', () => {
  assert.equal(classifyNavigation('https://app.example.test/assistant?x=1', APP), 'app')
  assert.equal(classifyNavigation('https://app.example.test/auth/callback#code', APP), 'app')
})

test('other web origins and mailto open externally', () => {
  assert.equal(classifyNavigation('https://accounts.google.com/o/oauth2', APP), 'external')
  assert.equal(classifyNavigation('http://app.example.test/', APP), 'external')
  assert.equal(classifyNavigation('https://app.example.test.evil.com/', APP), 'external')
  assert.equal(classifyNavigation('mailto:support@example.test', APP), 'external')
})

test('non-web schemes and unparsable targets are blocked', () => {
  assert.equal(classifyNavigation('javascript:alert(1)', APP), 'blocked')
  assert.equal(classifyNavigation('file:///etc/passwd', APP), 'blocked')
  assert.equal(classifyNavigation('accelerate-legal://auth?ticket=x', APP), 'blocked')
  assert.equal(classifyNavigation('not a url', APP), 'blocked')
  assert.equal(classifyNavigation('', APP), 'blocked')
})

test('without a configured server nothing is treated as the app', () => {
  assert.equal(classifyNavigation('https://app.example.test/', null), 'external')
})

test('permission allow-list', () => {
  assert.equal(isAllowedPermission('notifications'), true)
  assert.equal(isAllowedPermission('clipboard-read'), true)
  assert.equal(isAllowedPermission('media'), false)
  assert.equal(isAllowedPermission('geolocation'), false)
  assert.equal(isAllowedPermission(undefined), false)
})
