const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;
let currentFilePath = null;

function getAssetPath() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'app/dist');
    }
    return path.join(__dirname, '../../dist');
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: '#f5f5f5',
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true,
            additionalArguments: [`--app-path=${app.getAppPath()}`]
        }
    });

    // Enable loading of local resources
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        const parsedUrl = new URL(webContents.getURL());
        callback(parsedUrl.protocol === 'file:');
    });

    // Load the index.html file
    const indexPath = path.join(getAssetPath(), 'index.html');
    mainWindow.loadFile(indexPath).catch(err => {
        console.error('Failed to load index.html:', err);
        console.log('Attempted to load from:', indexPath);
    });

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Open DevTools in development
        if (!app.isPackaged) {
            mainWindow.webContents.openDevTools();
        }
    });

    // Handle window close
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

async function handleFileOpen(filePath) {
    try {
        if (!filePath) {
            const result = await dialog.showOpenDialog(mainWindow, {
                properties: ['openFile'],
                filters: [
                    { name: 'Mermaid Files', extensions: ['mermaid', 'mmd'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
                filePath = result.filePaths[0];
            } else {
                return;
            }
        }

        const content = await fs.readFile(filePath, 'utf8');
        currentFilePath = filePath;
        mainWindow.webContents.send('file-opened', { content, filePath });
        mainWindow.setTitle(`Mermaid Viewer - ${path.basename(filePath)}`);
    } catch (error) {
        console.error('Error opening file:', error);
        dialog.showErrorBox('Error', `Failed to open file: ${error.message}`);
    }
}

async function handleSave(content) {
    try {
        if (!currentFilePath) {
            return handleSaveAs(content);
        }

        await fs.writeFile(currentFilePath, content, 'utf8');
        return { success: true, filePath: currentFilePath };
    } catch (error) {
        console.error('Error saving file:', error);
        dialog.showErrorBox('Error', `Failed to save file: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function handleSaveAs(content) {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            filters: [
                { name: 'Mermaid Files', extensions: ['mermaid', 'mmd'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['showOverwriteConfirmation']
        });

        if (!result.canceled && result.filePath) {
            await fs.writeFile(result.filePath, content, 'utf8');
            currentFilePath = result.filePath;
            mainWindow.setTitle(`Mermaid Viewer - ${path.basename(result.filePath)}`);
            return { success: true, filePath: result.filePath };
        }
        return { success: false, error: 'Operation cancelled' };
    } catch (error) {
        console.error('Error in save as:', error);
        dialog.showErrorBox('Error', `Failed to save file: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Register IPC handlers
ipcMain.handle('open-file', () => handleFileOpen());
ipcMain.handle('save-file', (event, content) => handleSave(content));
ipcMain.handle('save-file-as', (event, content) => handleSaveAs(content));

// Prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.focus();

            // Check if a file path was passed as an argument
            const filePath = commandLine.find(arg => 
                arg.endsWith('.mermaid') || arg.endsWith('.mmd')
            );
            if (filePath) {
                handleFileOpen(filePath);
            }
        }
    });
}

// Register file association handlers
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

// Handle app lifecycle events
app.whenReady().then(() => {
    createWindow();

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

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    dialog.showErrorBox('Error', `An unexpected error occurred: ${error.message}`);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    dialog.showErrorBox('Error', `An unexpected error occurred: ${error.message}`);
});