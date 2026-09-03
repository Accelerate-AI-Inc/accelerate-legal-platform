'use strict'

const LINKS = {
  website: 'https://accelerateai.io',
  docs: 'https://github.com/asadmain124/accelerate-legal-platform/tree/main/docs',
  issues: 'https://github.com/asadmain124/accelerate-legal-platform/issues/new'
}

/**
 * Application menu. macOS conventions: app menu first with About, server
 * settings, updates and Quit; standard Edit/View/Window; Help with links.
 * `actions` are injected so the template stays electron-free and testable.
 */
function buildMenuTemplate({ isMac, isDev, appName, actions }) {
  const appMenu = {
    label: appName,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { label: 'Check for Updates…', click: () => actions.checkForUpdates() },
      { type: 'separator' },
      { label: 'Change Server…', accelerator: 'CmdOrCtrl+,', click: () => actions.changeServer() },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }

  const fileMenu = {
    label: 'File',
    submenu: [
      { label: 'Go Home', accelerator: 'CmdOrCtrl+Shift+H', click: () => actions.goHome() },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' }
    ]
  }

  const viewMenu = {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      ...(isDev ? [{ role: 'toggleDevTools' }] : []),
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  }

  const helpMenu = {
    role: 'help',
    submenu: [
      { label: 'Accelerate Legal Website', click: () => actions.openExternal(LINKS.website) },
      { label: 'Documentation', click: () => actions.openExternal(LINKS.docs) },
      { label: 'Report an Issue…', click: () => actions.openExternal(LINKS.issues) },
      { type: 'separator' },
      { label: 'Open Log Folder', click: () => actions.openLogs() }
    ]
  }

  return [...(isMac ? [appMenu] : []), fileMenu, { role: 'editMenu' }, viewMenu, { role: 'windowMenu' }, helpMenu]
}

module.exports = { LINKS, buildMenuTemplate }
