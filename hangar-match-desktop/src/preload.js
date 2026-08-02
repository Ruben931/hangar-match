const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hm", {
  licenseStatus: () => ipcRenderer.invoke("license:status"),
  activateLicense: (key) => ipcRenderer.invoke("license:activate", key),
  clearLicense: () => ipcRenderer.invoke("license:clear"),
  openCheckout: () => ipcRenderer.invoke("license:openCheckout"),
  gameStatus: () => ipcRenderer.invoke("game:status"),
  gameLogTail: () => ipcRenderer.invoke("game:logTail"),
  gamePoll: () => ipcRenderer.invoke("game:poll"),
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
});
