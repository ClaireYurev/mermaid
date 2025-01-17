const { contextBridge, ipcRenderer } = require('electron');

// Ensure Mermaid configuration is available in the renderer process
contextBridge.exposeInMainWorld('mermaidConfig', {
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    htmlLabels: true,
    curve: 'linear',
    padding: 15
  },
  sequence: {
    diagramMarginX: 50,
    diagramMarginY: 10,
    actorMargin: 50,
    width: 150,
    height: 65,
    boxMargin: 10
  }
});

// Expose file handling APIs
contextBridge.exposeInMainWorld('electron', {
  onFileOpened: (callback) => {
    ipcRenderer.on('file-opened', (event, data) => callback(data));
  },
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (content) => ipcRenderer.invoke('save-file', content),
  saveFileAs: (content) => ipcRenderer.invoke('save-file-as', content),
  isElectron: true
});