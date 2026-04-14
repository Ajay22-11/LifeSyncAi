import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Auto-Updater
autoUpdater.autoDownload = true;
autoUpdater.allowPrerelease = false;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#0f172a', // Matches our dashboard bg
    autoHideMenuBar: true,
    title: "LifeSync AI"
  });

  // In production, load the built index.html
  win.loadFile(path.join(__dirname, '../dist/index.html'));
  
  // win.webContents.openDevTools(); // Uncomment for debugging

  // Update Events
  autoUpdater.on('update-available', () => {
    win.webContents.send('update_available');
  });

  autoUpdater.on('update-downloaded', () => {
    win.webContents.send('update_downloaded');
  });

  autoUpdater.on('update-not-available', () => {
    win.webContents.send('update_not_available');
  });

  autoUpdater.on('error', (err) => {
    win.webContents.send('update_error', err.message);
  });
}

app.whenReady().then(() => {
  createWindow();
  
  // Check for updates on startup
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle update installation
ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});

// Manual update check
ipcMain.handle('check_for_updates', async () => {
  if (!app.isPackaged) return { error: 'Update check only available in production.' };
  try {
    const result = await autoUpdater.checkForUpdates();
    return result;
  } catch (err) {
    return { error: err.message };
  }
});
