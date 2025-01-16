  // src/main/preload.js
  const { contextBridge, ipcRenderer } = require('electron');
  
  contextBridge.exposeInMainWorld('electron', {
    onFileOpened: (callback) => {
      ipcRenderer.on('file-opened', (event, data) => callback(data));
    },
    openFile: () => ipcRenderer.invoke('open-file')
  });
  
