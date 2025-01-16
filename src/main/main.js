//src/main/main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Handle file opening from command line or double-click
  handleFileOpen();
}

async function handleFileOpen(filePath) {
  try {
    if (!filePath) {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Mermaid Files', extensions: ['mermaid'] }]
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        filePath = result.filePaths[0];
      } else {
        return;
      }
    }

    const content = await fs.readFile(filePath, 'utf8');
    mainWindow.webContents.send('file-opened', { content, filePath });
  } catch (error) {
    dialog.showErrorBox('Error', `Failed to open file: ${error.message}`);
  }
}

// Register file association handler
app.on('will-finish-launching', () => {
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    if (mainWindow) {
      handleFileOpen(filePath);
    } else {
      // Store the file path to open after window creation
      app.setAsDefaultProtocolClient('mermaid');
    }
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

