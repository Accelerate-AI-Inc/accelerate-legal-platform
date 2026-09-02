'use strict'

;(function offlinePage() {
  const setup = window.accelerateDesktopSetup
  const params = new URLSearchParams(window.location.search)
  const server = document.getElementById('server')
  const status = document.getElementById('status')
  const retry = document.getElementById('retry')
  const change = document.getElementById('change-server')

  server.textContent = params.get('server') || 'not configured'
  const reason = params.get('reason')
  if (reason) status.textContent = `Details: ${reason}`

  if (!setup) return

  retry.addEventListener('click', () => {
    retry.disabled = true
    status.textContent = 'Reconnecting…'
    setup.retry().catch(() => {
      retry.disabled = false
      status.textContent = 'Still unreachable. Try again in a moment.'
    })
  })

  change.addEventListener('click', () => {
    void setup.changeServer()
  })
})()
