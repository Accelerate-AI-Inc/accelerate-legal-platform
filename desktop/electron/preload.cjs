'use strict'

/**
 * Preload for every page the desktop window renders. Runs sandboxed with
 * context isolation, so it exposes two tiny, page-specific bridges and
 * nothing else:
 *
 *   - local setup pages (file://): connect / retry / change-server calls;
 *   - the configured server origin: `window.accelerateDesktop`, which the web
 *     app uses to detect the desktop and start browser-based Google sign-in.
 *
 * Any other origin (which the window should never reach) gets no bridge.
 */
const { contextBridge, ipcRenderer } = require('electron')

function argValue(name) {
  const prefix = `--${name}=`
  const hit = process.argv.find(arg => arg.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : ''
}

const serverOrigin = argValue('accelerate-server-origin')
const appVersion = argValue('accelerate-app-version')

// ipcMain.handle rejections arrive as "Error invoking remote method 'x': Error: msg".
// Strip the transport prefix so pages can show the message as-is.
function cleanIpcErrorMessage(error) {
  const raw = error && error.message ? String(error.message) : String(error || '')
  return raw.replace(/^Error invoking remote method '[^']+': (?:Error: )?/, '') || 'Something went wrong.'
}

function invoke(channel, ...args) {
  return ipcRenderer.invoke(channel, ...args).catch(error => {
    throw new Error(cleanIpcErrorMessage(error))
  })
}

if (window.location.protocol === 'file:') {
  contextBridge.exposeInMainWorld('accelerateDesktopSetup', {
    getConnection: () => invoke('desktop:get-connection'),
    connect: url => invoke('desktop:connect', String(url)),
    retry: () => invoke('desktop:retry'),
    changeServer: () => invoke('desktop:change-server')
  })
} else if (serverOrigin && window.location.origin === serverOrigin) {
  contextBridge.exposeInMainWorld('accelerateDesktop', {
    platform: process.platform,
    version: appVersion,
    signInWithGoogle: () => invoke('desktop:sign-in-with-google')
  })
}
