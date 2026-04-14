const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateAvailable: (callback) => ipcRenderer.on('update_available', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update_downloaded', callback),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update_not_available', callback),
  onUpdateError: (callback) => ipcRenderer.on('update_error', (event, message) => callback(message)),
  restartApp: () => ipcRenderer.send('restart_app'),
  checkForUpdates: () => ipcRenderer.invoke('check_for_updates')
});

window.addEventListener('DOMContentLoaded', () => {
    console.log('LifeSync AI Electron Preload Initialized');
});
