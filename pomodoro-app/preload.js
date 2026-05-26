const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (title, body) => ipcRenderer.send('show-notification', title, body),
  updateTrayTooltip: (text) => ipcRenderer.send('update-tray-tooltip', text)
});
