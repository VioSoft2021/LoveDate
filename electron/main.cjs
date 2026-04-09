const path = require('path')
const { app, BrowserWindow, shell, session } = require('electron')

function createWindow() {
  const defaultSession = session.defaultSession
  defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = new Set(['media', 'microphone', 'camera', 'fullscreen'])
    callback(allowedPermissions.has(permission))
  })

  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: '#0A0E27',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html')
  window.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) {
      return
    }

    const safeHtml = `
      <html>
        <body style="background:#0A0E27;color:#f4e6c1;font-family:Segoe UI,sans-serif;padding:24px">
          <h2>LoveDate could not load</h2>
          <p><strong>Error:</strong> ${errorCode} - ${errorDescription}</p>
          <p><strong>URL:</strong> ${validatedURL ?? 'unknown'}</p>
          <p>Rebuild the app and retry: <code>npm run dist:desktop:all</code></p>
        </body>
      </html>
    `
    window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(safeHtml)}`)
  })

  window.loadFile(indexPath).catch((error) => {
    // Keep this in stdout for packaging diagnostics.
    console.error('Failed to load index.html:', error)
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
