'use strict'

const CHECK_DELAY_MS = 15 * 1000
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

/**
 * Background updates through electron-updater against the GitHub Releases
 * feed declared in package.json `build.publish`. Updates only work for signed
 * builds; every failure is logged and swallowed so an unsigned or offline
 * build behaves exactly like one with updates disabled.
 */
function setupAutoUpdates({ autoUpdater, log, enabled, setTimer = setTimeout, setInterval: setRepeat = setInterval }) {
  if (!enabled || !autoUpdater) {
    return {
      enabled: false,
      checkNow: async () => ({ status: 'disabled' })
    }
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = null
  autoUpdater.on('error', error => log('warn', 'update check failed', { message: error && error.message }))
  autoUpdater.on('update-downloaded', info => log('info', 'update downloaded', { version: info && info.version }))

  const backgroundCheck = () => {
    Promise.resolve()
      .then(() => autoUpdater.checkForUpdatesAndNotify())
      .catch(error => log('warn', 'background update check failed', { message: error && error.message }))
  }
  const initial = setTimer(backgroundCheck, CHECK_DELAY_MS)
  const repeat = setRepeat(backgroundCheck, CHECK_INTERVAL_MS)
  if (initial && initial.unref) initial.unref()
  if (repeat && repeat.unref) repeat.unref()

  return {
    enabled: true,
    /** Manual check from the menu. Resolves to a small status object for a dialog. */
    async checkNow() {
      try {
        const result = await autoUpdater.checkForUpdates()
        const available = Boolean(result && result.isUpdateAvailable)
        return {
          status: available ? 'available' : 'up-to-date',
          version: result && result.updateInfo ? result.updateInfo.version : undefined
        }
      } catch (error) {
        log('warn', 'manual update check failed', { message: error && error.message })
        return { status: 'error' }
      }
    }
  }
}

module.exports = { CHECK_DELAY_MS, CHECK_INTERVAL_MS, setupAutoUpdates }
