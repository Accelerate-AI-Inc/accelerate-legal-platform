'use strict'

const crypto = require('node:crypto')
const path = require('node:path')
const { app, BrowserWindow, Menu, dialog, ipcMain, net, screen, session, shell } = require('electron')

const { createConfigStore } = require('./config-store.cjs')
const { PROTOCOL_SCHEME, extractDeepLinkFromArgv, parseDeepLink } = require('./deep-link.cjs')
const { createLogger } = require('./log.cjs')
const { buildMenuTemplate } = require('./menu.cjs')
const { classifyNavigation, isAllowedPermission } = require('./navigation.cjs')
const { DEFAULT_SERVER_URL, interpretHealthResponse, normalizeServerUrl } = require('./server-url.cjs')
const { createDesktopSignIn } = require('./sign-in.cjs')
const { setupAutoUpdates } = require('./updater.cjs')
const { MIN_HEIGHT, MIN_WIDTH, restoreWindowBounds } = require('./window-bounds.cjs')

const APP_NAME = 'Accelerate Legal'
const IS_MAC = process.platform === 'darwin'
const IS_DEV = !app.isPackaged
const PAGES_DIR = path.join(__dirname, '..', 'pages')
const PAPER = '#faf8f5'
const HEALTH_TIMEOUT_MS = 8000

// Tests and side-by-side installs can point the app at a private data directory.
if (process.env.ACCELERATE_DESKTOP_USER_DATA_DIR) {
  app.setPath('userData', path.resolve(process.env.ACCELERATE_DESKTOP_USER_DATA_DIR))
}

// One running copy: a second launch (Dock click, deep link) focuses this one.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  boot()
}

function boot() {
  const userData = app.getPath('userData')
  const logDir = path.join(userData, 'logs')
  const log = createLogger(path.join(logDir, 'desktop.log'))
  const store = createConfigStore(path.join(userData, 'config.json'))
  const signIn = createDesktopSignIn({ randomId: () => crypto.randomBytes(32).toString('base64url') })

  let serverOrigin = resolveInitialServerOrigin()
  let mainWindow = null
  let pendingDeepLink = null
  let updates = { enabled: false, checkNow: async () => ({ status: 'disabled' }) }

  function resolveInitialServerOrigin() {
    const candidate = process.env.ACCELERATE_DESKTOP_SERVER_URL || store.get('serverUrl')
    if (!candidate) return null
    try {
      return normalizeServerUrl(candidate)
    } catch (error) {
      log('warn', 'stored server url rejected', { message: error.message })
      return null
    }
  }

  // ---------------------------------------------------------------------------
  // Windows
  // ---------------------------------------------------------------------------

  function windowWebPreferences() {
    return {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: true,
      additionalArguments: [
        `--accelerate-server-origin=${serverOrigin || ''}`,
        `--accelerate-app-version=${app.getVersion()}`
      ]
    }
  }

  function openExternal(url) {
    shell.openExternal(url).catch(error => log('warn', 'openExternal failed', { message: error.message }))
  }

  function attachWebContentsPolicy(contents) {
    contents.on('will-navigate', (event, url) => {
      const verdict = classifyNavigation(url, serverOrigin)
      if (verdict === 'app') return
      event.preventDefault()
      if (verdict === 'external') openExternal(url)
      else log('warn', 'blocked navigation', { scheme: String(url).split(':')[0] })
    })

    contents.setWindowOpenHandler(({ url }) => {
      const verdict = classifyNavigation(url, serverOrigin)
      if (verdict === 'external') {
        openExternal(url)
        return { action: 'deny' }
      }
      if (verdict === 'app') {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            backgroundColor: PAPER,
            minWidth: MIN_WIDTH,
            minHeight: MIN_HEIGHT,
            webPreferences: windowWebPreferences()
          }
        }
      }
      return { action: 'deny' }
    })

    contents.on('did-create-window', child => attachWebContentsPolicy(child.webContents))

    contents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
      // -3 is ERR_ABORTED: a navigation superseded by another, not a failure.
      if (!isMainFrame || errorCode === -3) return
      log('warn', 'main frame failed to load', { errorCode, errorDescription })
      if (serverOrigin && String(validatedUrl).startsWith(serverOrigin)) {
        showOfflinePage(contents, errorDescription)
      }
    })

    contents.on('render-process-gone', (_event, details) => {
      log('error', 'renderer gone', { reason: details.reason })
      if (details.reason !== 'clean-exit') loadApp(contents)
    })
  }

  function createMainWindow() {
    const bounds = restoreWindowBounds(store.get('windowBounds'), screen.getAllDisplays())
    const win = new BrowserWindow({
      ...bounds,
      minWidth: MIN_WIDTH,
      minHeight: MIN_HEIGHT,
      show: false,
      title: APP_NAME,
      backgroundColor: PAPER,
      webPreferences: windowWebPreferences()
    })

    win.once('ready-to-show', () => win.show())

    let boundsTimer = null
    const persistBounds = () => {
      clearTimeout(boundsTimer)
      boundsTimer = setTimeout(() => {
        if (win.isDestroyed() || win.isFullScreen() || win.isMaximized()) return
        store.set('windowBounds', win.getNormalBounds())
      }, 400)
    }
    win.on('resize', persistBounds)
    win.on('move', persistBounds)
    win.on('closed', () => {
      clearTimeout(boundsTimer)
      if (mainWindow === win) mainWindow = null
    })

    attachWebContentsPolicy(win.webContents)
    mainWindow = win
    return win
  }

  function ensureMainWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) return mainWindow
    return createMainWindow()
  }

  function focusMainWindow() {
    const win = ensureMainWindow()
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
    return win
  }

  // Replace the window after the server changes: the preload learns the
  // server origin from launch arguments fixed at window creation.
  function replaceMainWindow() {
    const previous = mainWindow
    const next = createMainWindow()
    loadApp(next.webContents)
    if (previous && !previous.isDestroyed()) previous.close()
  }

  // ---------------------------------------------------------------------------
  // Pages
  // ---------------------------------------------------------------------------

  function loadApp(contents, pathname = '/') {
    if (!contents || contents.isDestroyed()) return
    if (!serverOrigin) {
      showConnectPage(contents)
      return
    }
    const target = new URL(pathname, serverOrigin).toString()
    contents.loadURL(target).catch(error => log('warn', 'loadURL failed', { message: error.message }))
  }

  function showConnectPage(contents) {
    contents
      .loadFile(path.join(PAGES_DIR, 'connect.html'))
      .catch(error => log('error', 'connect page failed', { message: error.message }))
  }

  function showOfflinePage(contents, reason) {
    contents
      .loadFile(path.join(PAGES_DIR, 'offline.html'), {
        query: { server: serverOrigin || '', reason: String(reason || '') }
      })
      .catch(error => log('error', 'offline page failed', { message: error.message }))
  }

  async function probeServer(origin) {
    let response
    try {
      response = await net.fetch(`${origin}/api/health`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS)
      })
    } catch (error) {
      log('warn', 'health probe failed', { message: error && error.message })
      throw new Error(`Could not reach ${origin}. Check the address and your internet connection.`)
    }
    let body = null
    try {
      body = await response.json()
    } catch {
      body = null
    }
    const verdict = interpretHealthResponse(response.status, body)
    if (!verdict.ok) throw new Error(verdict.message)
  }

  // ---------------------------------------------------------------------------
  // IPC (renderer -> main). Every handler checks who is asking.
  // ---------------------------------------------------------------------------

  function senderUrl(event) {
    try {
      return new URL(event.senderFrame ? event.senderFrame.url : event.sender.getURL())
    } catch {
      return null
    }
  }

  function requireLocalPage(event) {
    const url = senderUrl(event)
    if (!url || url.protocol !== 'file:') throw new Error('This action is not available here.')
  }

  function requireAppPage(event) {
    const url = senderUrl(event)
    if (!url || !serverOrigin || url.origin !== serverOrigin) {
      throw new Error('This action is only available to the Accelerate Legal app.')
    }
  }

  ipcMain.handle('desktop:get-connection', event => {
    requireLocalPage(event)
    return { serverUrl: serverOrigin, defaultServerUrl: DEFAULT_SERVER_URL, version: app.getVersion() }
  })

  ipcMain.handle('desktop:connect', async (event, input) => {
    requireLocalPage(event)
    const origin = normalizeServerUrl(input)
    await probeServer(origin)
    store.set('serverUrl', origin)
    const changed = origin !== serverOrigin
    serverOrigin = origin
    log('info', 'server configured', { origin })
    if (changed) {
      // A different server means a different account; drop the old session.
      await session.defaultSession.clearStorageData({ storages: ['cookies', 'localstorage', 'indexdb', 'serviceworkers'] })
    }
    replaceMainWindow()
    return { serverUrl: origin }
  })

  ipcMain.handle('desktop:retry', event => {
    requireLocalPage(event)
    loadApp(event.sender)
  })

  ipcMain.handle('desktop:change-server', event => {
    requireLocalPage(event)
    showConnectPage(event.sender)
  })

  ipcMain.handle('desktop:sign-in-with-google', async event => {
    requireAppPage(event)
    const attempt = signIn.begin()
    const url = new URL('/auth/desktop', serverOrigin)
    url.searchParams.set('requestId', attempt.requestId)
    log('info', 'desktop sign-in started')
    await shell.openExternal(url.toString())
    return attempt.promise
  })

  // ---------------------------------------------------------------------------
  // Deep links (accelerate-legal://)
  // ---------------------------------------------------------------------------

  function handleDeepLink(rawUrl) {
    const link = parseDeepLink(rawUrl)
    if (!link) {
      log('warn', 'ignored deep link')
      return
    }
    if (!app.isReady()) {
      pendingDeepLink = rawUrl
      return
    }
    const win = focusMainWindow()
    if (link.kind === 'auth') {
      if (!signIn.complete(link.ticket)) log('warn', 'sign-in ticket arrived with no pending attempt')
    } else if (link.kind === 'auth-error') {
      signIn.fail(link.message)
    } else if (link.kind === 'open') {
      loadApp(win.webContents, link.path)
    }
  }

  app.on('open-url', (event, url) => {
    event.preventDefault()
    handleDeepLink(url)
  })

  app.on('second-instance', (_event, argv) => {
    focusMainWindow()
    const link = extractDeepLinkFromArgv(argv)
    if (link) handleDeepLink(link)
  })

  // ---------------------------------------------------------------------------
  // Menu
  // ---------------------------------------------------------------------------

  async function checkForUpdatesFromMenu() {
    const win = focusMainWindow()
    const result = await updates.checkNow()
    const messages = {
      disabled: {
        message: 'Automatic updates are not available in this build.',
        detail: 'Download the latest release from GitHub to update.'
      },
      'up-to-date': { message: `You're up to date.`, detail: `${APP_NAME} ${app.getVersion()} is the latest version.` },
      available: {
        message: `Version ${result.version || ''} is available.`.replace('  ', ' '),
        detail: 'It is downloading now and will install the next time you quit the app.'
      },
      error: {
        message: 'Could not check for updates.',
        detail: 'Check your internet connection and try again later.'
      }
    }
    const content = messages[result.status] || messages.error
    await dialog.showMessageBox(win, { type: 'info', buttons: ['OK'], title: APP_NAME, ...content })
  }

  function installMenu() {
    const template = buildMenuTemplate({
      isMac: IS_MAC,
      isDev: IS_DEV,
      appName: APP_NAME,
      actions: {
        changeServer: () => showConnectPage(focusMainWindow().webContents),
        checkForUpdates: () => void checkForUpdatesFromMenu(),
        goHome: () => loadApp(focusMainWindow().webContents),
        openExternal,
        openLogs: () => shell.openPath(logDir).catch(error => log('warn', 'openPath failed', { message: error.message }))
      }
    })
    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
  }

  // ---------------------------------------------------------------------------
  // Session hardening
  // ---------------------------------------------------------------------------

  function hardenSession() {
    const ses = session.defaultSession
    const permitted = (permission, requestingUrl) => {
      try {
        return new URL(requestingUrl).origin === serverOrigin && isAllowedPermission(permission)
      } catch {
        return false
      }
    }
    ses.setPermissionRequestHandler((_contents, permission, callback, details) => {
      callback(permitted(permission, details.requestingUrl))
    })
    ses.setPermissionCheckHandler((_contents, permission, requestingOrigin) => permitted(permission, requestingOrigin))
    app.on('web-contents-created', (_event, contents) => {
      contents.on('will-attach-webview', event => event.preventDefault())
    })
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  app.setName(APP_NAME)
  app.userAgentFallback = `${app.userAgentFallback} AccelerateLegalDesktop/${app.getVersion()}`
  if (IS_DEV && process.argv[1]) {
    app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, [path.resolve(process.argv[1])])
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL_SCHEME)
  }

  app.whenReady().then(() => {
    log('info', 'app ready', { version: app.getVersion(), packaged: app.isPackaged, hasServer: Boolean(serverOrigin) })
    hardenSession()
    installMenu()

    const win = createMainWindow()
    loadApp(win.webContents)

    let autoUpdater = null
    if (app.isPackaged && !process.env.ACCELERATE_DESKTOP_DISABLE_UPDATES) {
      try {
        autoUpdater = require('electron-updater').autoUpdater
      } catch (error) {
        log('warn', 'electron-updater unavailable', { message: error.message })
      }
    }
    updates = setupAutoUpdates({ autoUpdater, log, enabled: Boolean(autoUpdater) })

    if (pendingDeepLink) {
      const link = pendingDeepLink
      pendingDeepLink = null
      handleDeepLink(link)
    }
    const argvLink = extractDeepLinkFromArgv(process.argv)
    if (argvLink) handleDeepLink(argvLink)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) loadApp(createMainWindow().webContents)
    else focusMainWindow()
  })

  app.on('window-all-closed', () => {
    if (!IS_MAC) app.quit()
  })
}
