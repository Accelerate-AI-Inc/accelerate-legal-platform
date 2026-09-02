'use strict'

;(function connectPage() {
  const setup = window.accelerateDesktopSetup
  const form = document.getElementById('connect-form')
  const input = document.getElementById('server-url')
  const error = document.getElementById('error')
  const status = document.getElementById('status')
  const connectButton = document.getElementById('connect')
  const useDefault = document.getElementById('use-default')
  const footer = document.getElementById('footer')
  let defaultServerUrl = 'https://app.accelerateai.io'

  function setBusy(busy) {
    connectButton.disabled = busy
    useDefault.disabled = busy
    input.disabled = busy
    status.textContent = busy ? 'Checking the server…' : ''
  }

  async function connect(url) {
    error.textContent = ''
    setBusy(true)
    try {
      await setup.connect(url)
      status.textContent = 'Connected. Opening Accelerate Legal…'
    } catch (failure) {
      setBusy(false)
      error.textContent = failure && failure.message ? failure.message : 'Could not connect. Please try again.'
      input.focus()
    }
  }

  if (!setup) {
    error.textContent = 'This page can only be used inside the Accelerate Legal app.'
    return
  }

  setup
    .getConnection()
    .then(connection => {
      defaultServerUrl = connection.defaultServerUrl || defaultServerUrl
      input.placeholder = defaultServerUrl
      input.value = connection.serverUrl || defaultServerUrl
      footer.textContent = `Accelerate Legal for Mac ${connection.version || ''}`.trim()
      input.focus()
      input.select()
    })
    .catch(() => {
      input.value = defaultServerUrl
    })

  form.addEventListener('submit', event => {
    event.preventDefault()
    void connect(input.value)
  })

  useDefault.addEventListener('click', () => {
    input.value = defaultServerUrl
    void connect(defaultServerUrl)
  })
})()
