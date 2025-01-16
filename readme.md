Project Plan: .Mermaid File Viewer for Windows

Overview

The .Mermaid File Viewer is a desktop application for Windows that allows users to open, view, and interact with .mermaid files. It integrates the Mermaid.js library for rendering diagrams and provides an elegant, modern interface tailored for both developers and designers.

Project Structure

Technology Stack

Frontend/Backend Framework: Electron (JavaScript/TypeScript-based desktop framework).

Diagram Rendering: Mermaid.js (embedded via web-based renderer).

UI/UX Design: HTML, CSS, JavaScript with libraries like Bootstrap or Tailwind CSS for modern design.

Code Editor: Monaco Editor (for syntax highlighting and code editing).

Packaging and Deployment: Electron Builder for Windows installer generation.

File Structure

mermaid-viewer/
├── src/
│   ├── main/           # Main process code
│   │   ├── main.js     # Electron entry point
│   │   ├── file-handler.js  # File opening logic
│   │   └── settings.js # User preferences handling
│   ├── renderer/       # Renderer process code
│   │   ├── index.html  # Main UI layout
│   │   ├── app.js      # UI interaction logic
│   │   ├── styles.css  # Custom styles
│   │   └── components/ # Reusable UI components
│   ├── assets/         # Images, icons, etc.
│   └── utils/          # Utility functions
├── package.json        # Project metadata
├── README.md           # Documentation
└── build/              # Packaged app builds

Core Features

1. File Handling

Drag-and-Drop: Drag .mermaid files directly into the application to open.

File Menu: Standard menu bar with Open option (shortcut: Ctrl+O).

Double-Click Integration: Register as the default application for .mermaid files.

Error Handling: Validate the file format and provide feedback for invalid files.

2. Rendering Engine

Embed a Chromium-based WebView to render diagrams using Mermaid.js.

Support for dynamic rendering of complex diagrams.

3. User Interface

Toolbar:

Open, Refresh, Zoom In/Out, Export, and Settings.

Viewer Area:

Central pane for rendered diagrams.

Panning and zooming support via mouse or touchpad.

Code View Toggle:

Split view with a Mermaid code editor (Monaco Editor).

Resizable Layout:

Adjust viewer and code editor panes dynamically.

4. Export Options

Export diagrams as PNG, SVG, or PDF.

Allow users to specify resolution and file location.

5. Customization Options

Themes:

Light and dark mode.

Support for custom Mermaid.js themes.

Rendering Settings:

Font size, scaling, and diagram orientation.

Syntax Highlighting:

Monaco Editor integration for Mermaid.js syntax.

6. Performance and Compatibility

Optimize the embedded WebView for low memory usage.

Test with large, complex diagrams to ensure responsiveness.

Ensure compatibility with Windows 10 and later versions.

7. Testing and Debugging

Implement unit tests for critical functions (e.g., file handling, rendering).

Log errors to a file for user support and debugging.

Provide helpful error messages for invalid syntax or rendering issues.

8. Deployment

Package the application using Electron Builder.

Provide a Windows installer (.msi or .exe) with options for:

Setting the app as the default viewer for .mermaid files.

Creating a desktop shortcut.

Implementation Details

Main Process (Electron)

Entry Point: main.js

Responsibilities:

Handle application lifecycle (launch, close, minimize).

Register file associations for .mermaid files.

Open files and pass their content to the renderer process.

// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile('src/renderer/index.html');
});

app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    mainWindow.webContents.send('open-file', filePath);
  }
});

Renderer Process

Responsibilities:

Render Mermaid diagrams in the viewer area.

Provide UI interactions (toolbar, zooming, exporting).

Synchronize code editor with the diagram view.

// app.js
const { ipcRenderer } = require('electron');
const mermaid = require('mermaid');

ipcRenderer.on('open-file', (event, filePath) => {
  fetch(filePath)
    .then((response) => response.text())
    .then((content) => {
      document.getElementById('mermaid-code').value = content;
      renderDiagram(content);
    });
});

function renderDiagram(code) {
  try {
    const container = document.getElementById('diagram');
    container.innerHTML = mermaid.render('mermaid', code);
  } catch (err) {
    console.error('Mermaid rendering error:', err);
  }
}

UI Design

Wireframe

Main Layout:

Toolbar at the top.

Central viewer pane.

Toggleable side panel for code editing.

Toolbar Options:

Icons with tooltips for easy navigation.

Styling

Use modern fonts and colors for a clean look.

Apply consistent spacing and responsive layout.

Timeline

Phase

Duration

Deliverables

Planning

1 week

Requirements, wireframes

Development

4 weeks

Core features, UI implementation

Testing

2 weeks

Bug fixes, performance optimization

Deployment

1 week

Packaged installer, documentation

Conclusion

The .Mermaid File Viewer will be a powerful yet intuitive tool for viewing and editing Mermaid.js diagrams. Leveraging modern frameworks and best practices, it will offer a seamless user experience tailored for Windows users.

