import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { STORE } from "./config.js";
import {
  getGameStatus,
  readGameLogTail,
  pollGameLog,
} from "./game-bridge.js";
import {
  activateLicense,
  validateStoredLicense,
  loadLicense,
  clearLicense,
  getCheckoutUrl,
} from "./license.js";

if (started) {
  app.quit();
}

let mainWindow = null;
let logCursor = 0;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 900,
    minHeight: 640,
    title: STORE.productName,
    backgroundColor: "#ebe4d4",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }
};

function registerIpc() {
  ipcMain.handle("license:status", async () => {
    const stored = loadLicense();
    const check = await validateStoredLicense();
    return {
      licensed: Boolean(check.valid),
      checkoutUrl: getCheckoutUrl(),
      webAppUrl: STORE.webAppUrl,
      product: STORE.productName,
      version: STORE.version,
      stored,
      error: check.error || null,
    };
  });

  ipcMain.handle("license:activate", async (_e, key) => {
    const result = await activateLicense(key);
    return result;
  });

  ipcMain.handle("license:clear", async () => {
    clearLicense();
    return { ok: true };
  });

  ipcMain.handle("license:openCheckout", async () => {
    await shell.openExternal(getCheckoutUrl());
    return { ok: true };
  });

  ipcMain.handle("game:status", async () => getGameStatus());

  ipcMain.handle("game:logTail", async () => readGameLogTail());

  ipcMain.handle("game:poll", async () => {
    const result = await pollGameLog(logCursor);
    logCursor = result.lastSize || logCursor;
    return result;
  });

  ipcMain.handle("shell:openExternal", async (_e, url) => {
    if (typeof url === "string" && /^https?:\/\//i.test(url)) {
      await shell.openExternal(url);
      return { ok: true };
    }
    return { ok: false };
  });
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
