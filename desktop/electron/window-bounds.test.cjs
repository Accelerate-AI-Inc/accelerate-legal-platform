'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { restoreWindowBounds } = require('./window-bounds.cjs')

const DISPLAY = { workArea: { x: 0, y: 0, width: 1920, height: 1080 } }

test('nothing saved gives the default size without a position', () => {
  assert.deepEqual(restoreWindowBounds(undefined, [DISPLAY]), { width: 1280, height: 840 })
})

test('bounds on a connected display are restored', () => {
  assert.deepEqual(restoreWindowBounds({ x: 100, y: 50, width: 1000, height: 700 }, [DISPLAY]), {
    x: 100,
    y: 50,
    width: 1000,
    height: 700
  })
})

test('bounds on a disconnected display keep the size but drop the position', () => {
  assert.deepEqual(restoreWindowBounds({ x: 5000, y: 50, width: 1000, height: 700 }, [DISPLAY]), {
    width: 1000,
    height: 700
  })
})

test('sizes are clamped to the minimum window size', () => {
  assert.deepEqual(restoreWindowBounds({ width: 200, height: 100 }, [DISPLAY]), { width: 900, height: 600 })
})
