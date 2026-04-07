const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('lovedateDesktop', {
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node,
  },
})
