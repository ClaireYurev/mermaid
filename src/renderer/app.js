import * as monaco from 'monaco-editor';
import mermaid from 'mermaid';

// Global variables
let editor;
let currentZoom = 1.0;
let isPanning = false;
let lastX;
let lastY;

// Initialize Mermaid
mermaid.initialize({
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

// Error handler for ResizeObserver
const resizeObserverError = error => {
    if (error.message === 'ResizeObserver loop completed with undelivered notifications.') {
        return; // Ignore this false positive
    }
    console.error(error);
};

window.addEventListener('error', event => {
    if (event.error instanceof Error) {
        resizeObserverError(event.error);
    }
});

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
    await initializeMonaco();
    setupEventListeners();
    setupResizableDivider();
    setupToolToggle();
    updateViewControlsPosition(); // Initial positioning
});

// Monaco Editor Initialization
async function initializeMonaco() {
    const editorContainer = document.getElementById('monaco-editor');
    let layoutTimeout;

    // Register Mermaid language
    monaco.languages.register({ id: 'mermaid' });

    // Define Mermaid syntax highlighting rules
    monaco.languages.setMonarchTokensProvider('mermaid', {
        defaultToken: '',
        tokenPostfix: '.mmd',
        keywords: [
            'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
            'pie', 'gantt', 'journey', 'gitGraph', 'erDiagram'
        ],
        typeKeywords: [
            'TD', 'TB', 'BT', 'RL', 'LR', 'participant', 'actor', 'class', 'state'
        ],
        operators: [
            '-->', '-.->', '==>', '-.->>', '-->>',
            '---|', '-.-|', '===|', '-.-|>', '--|>'
        ],
        operatorSymbols: /--|->|==>|\.|::|:/,
        tokenizer: {
            root: [
                [/[a-zA-Z_$][\w$]*/, {
                    cases: {
                        '@keywords': 'keyword',
                        '@typeKeywords': 'type',
                        '@default': 'identifier'
                    }
                }],
                [/"([^"\\]|\\.)*$/, 'string.invalid'],
                [/"/, { token: 'string.quote', next: '@string' }],
                [/%%.*$/, 'comment'],
                [/@operatorSymbols/, 'operator'],
                [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
                [/\d+/, 'number'],
                [/[{}()\[\]]/, '@brackets'],
                [/[<>](?!@operatorSymbols)/, '@brackets'],
            ],
            string: [
                [/[^\\"]+/, 'string'],
                [/"/, { token: 'string.quote', next: '@pop' }]
            ]
        }
    });

    // Create Monaco editor instance
    editor = monaco.editor.create(editorContainer, {
        value: getDefaultDiagram(),
        language: 'mermaid',
        theme: 'vs-light',
        minimap: { enabled: false },
        automaticLayout: false,
        wordWrap: 'on',
        lineNumbers: 'on',
        roundedSelection: true,
        scrollBeyondLastLine: false,
        renderWhitespace: 'none',
        contextmenu: true,
        fontSize: 14,
        lineHeight: 21,
        formatOnPaste: true,
        formatOnType: true,
        suggestOnTriggerCharacters: true,
        renderControlCharacters: false,
        rulers: [],
        overviewRulerLanes: 0
    });

    // Setup ResizeObserver for editor
    try {
        const ro = new ResizeObserver(entries => {
            if (layoutTimeout) {
                clearTimeout(layoutTimeout);
            }
            layoutTimeout = setTimeout(() => {
                try {
                    editor.layout();
                } catch (error) {
                    console.warn('Editor layout update failed:', error);
                }
            }, 100);
        });

        ro.observe(editorContainer);
    } catch (error) {
        console.warn('ResizeObserver not supported, falling back to window resize event');
        window.addEventListener('resize', debounce(() => {
            try {
                editor.layout();
            } catch (error) {
                console.warn('Editor layout update failed:', error);
            }
        }, 100));
    }

    // Initial render
    const content = editor.getValue();
    await updateMermaidDiagram(content);

    // Add change listener with debounce
    editor.onDidChangeModelContent(debounce(async () => {
        const content = editor.getValue();
        await updateMermaidDiagram(content);
    }, 300));
}

// View Controls Positioning
function updateViewControlsPosition() {
    const editorContainer = document.getElementById('editor-container');
    const viewControls = document.querySelector('.view-controls');
    const toolbar = document.querySelector('.toolbar');
    const fileControls = document.querySelector('.file-controls');
    
    if (!editorContainer || !viewControls || !toolbar || !fileControls) return;

    const editorRect = editorContainer.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    const fileControlsRect = fileControls.getBoundingClientRect();
    
    // Increase minimum spacing from 20px to 40px
    const minLeftPosition = fileControlsRect.right + 80; // Doubled the padding

    let newLeftPosition;
    if (editorContainer.classList.contains('hidden')) {
        // When editor is hidden, position after file controls
        newLeftPosition = minLeftPosition;
    } else {
        // When editor is visible, position after editor with increased padding
        newLeftPosition = editorRect.right + 80; // Also doubled this padding
    }

    // Ensure we never go left of the minimum position
    newLeftPosition = Math.max(newLeftPosition, minLeftPosition);
    
    viewControls.style.left = `${newLeftPosition}px`;
    viewControls.style.top = `${toolbarRect.top}px`;
}

// Resizable Divider Setup
function setupResizableDivider() {
    const editorContainer = document.getElementById('editor-container');
    const viewerContainer = document.getElementById('viewer-container');
    const divider = document.querySelector('.divider');
    let isDragging = false;

    divider.addEventListener('mousedown', (e) => {
        isDragging = true;
        divider.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const containerWidth = document.querySelector('.main-content').offsetWidth;
        let newWidth = e.clientX;

        // Enforce minimum width constraints
        newWidth = Math.max(100, newWidth);
        newWidth = Math.min(newWidth, containerWidth - 200);

        // Set the new width as a percentage
        const widthPercentage = (newWidth / containerWidth) * 100;
        editorContainer.style.width = `${widthPercentage}%`;
        
        // Update view controls position while dragging
        updateViewControlsPosition();
        
        // Ensure Monaco editor reflows correctly
        if (editor) {
            editor.layout();
        }
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        divider.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    });
}

// Event Listeners Setup
function setupEventListeners() {
    // Editor toggle
    document.getElementById('toggleEditor')?.addEventListener('click', () => {
        const editorContainer = document.getElementById('editor-container');
        const viewerContainer = document.getElementById('viewer-container');
        const isHidden = editorContainer.classList.contains('hidden');
        
        editorContainer.style.transition = 'width 0.3s ease';
        viewerContainer.style.transition = 'width 0.3s ease';
        
        if (!isHidden) {
            editorContainer.style.width = '0';
            viewerContainer.style.width = '100%';
            setTimeout(() => {
                editorContainer.classList.add('hidden');
                updateViewControlsPosition();
            }, 300);
        } else {
            editorContainer.classList.remove('hidden');
            editorContainer.style.width = '40%';
            viewerContainer.style.width = '60%';
            setTimeout(() => {
                editor?.layout();
                updateViewControlsPosition();
            }, 300);
        }

        // Remove transitions after animation
        setTimeout(() => {
            editorContainer.style.transition = '';
            viewerContainer.style.transition = '';
        }, 300);
    });

    // Zoom controls
    document.getElementById('zoomIn')?.addEventListener('click', () => handleZoom('in'));
    document.getElementById('zoomOut')?.addEventListener('click', () => handleZoom('out'));

    // File handling
    if (window.electron?.onFileOpened) {
        window.electron.onFileOpened(({ content, filePath }) => {
            if (editor) {
                editor.setValue(content);
                document.title = `Mermaid Viewer - ${filePath}`;
            }
        });
    }

    // Save file handler
    document.getElementById('saveFile')?.addEventListener('click', () => {
        if (window.electron?.saveFile) {
            window.electron.saveFile(editor.getValue());
        }
    });

    // Window resize
    window.addEventListener('resize', debounce(() => {
        updateViewControlsPosition();
        if (editor) {
            try {
                requestAnimationFrame(() => {
                    editor.layout();
                });
            } catch (error) {
                resizeObserverError(error);
            }
        }
    }, 100));
}

// Tool Toggle Setup
function setupToolToggle() {
    const toggleButton = document.getElementById('toggleTool');
    const viewerContainer = document.getElementById('viewer-container');
    
    toggleButton.addEventListener('click', () => {
        toggleButton.classList.toggle('active');
        const isSelectMode = toggleButton.classList.contains('active');
        toggleButton.title = isSelectMode ? 'Switch to Pan Tool' : 'Switch to Select Tool';
        viewerContainer.style.cursor = isSelectMode ? 'default' : 'grab';

        const selectIcon = toggleButton.querySelector('.select-icon');
        const panIcon = toggleButton.querySelector('.pan-icon');
        selectIcon.classList.toggle('hidden');
        panIcon.classList.toggle('hidden');
    });

    viewerContainer.addEventListener('mousedown', (e) => {
        if (toggleButton.classList.contains('active')) return;
        
        isPanning = true;
        lastX = e.pageX;
        lastY = e.pageY;
        viewerContainer.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        
        const dx = e.pageX - lastX;
        const dy = e.pageY - lastY;
        
        viewerContainer.scrollLeft -= dx;
        viewerContainer.scrollTop -= dy;
        
        lastX = e.pageX;
        lastY = e.pageY;
    });

    document.addEventListener('mouseup', () => {
        if (!isPanning) return;
        isPanning = false;
        viewerContainer.style.cursor = toggleButton.classList.contains('active') ? 'default' : 'grab';
    });
}

// Mermaid Diagram Update
async function updateMermaidDiagram(content) {
    const mermaidContainer = document.getElementById('mermaid-diagram');
    if (!mermaidContainer) return;
    
    try {
        mermaidContainer.innerHTML = '';
        
        const diagramDiv = document.createElement('div');
        diagramDiv.className = 'mermaid';
        diagramDiv.style.zoom = currentZoom;
        diagramDiv.textContent = formatMermaidContent(content);
        
        mermaidContainer.appendChild(diagramDiv);
        
        await mermaid.run();
        clearErrorMessage();
        
    } catch (error) {
        console.error('Mermaid rendering error:', error);
        showErrorMessage(error.message);
    }
}

// Zoom Handling
function handleZoom(direction) {
    const zoomStep = 0.25;
    const minZoom = 0.1;
    const maxZoom = 8.0;
    
    if (direction === 'in' && currentZoom < maxZoom) {
        currentZoom = Math.min(currentZoom * 1.25, maxZoom);
    } else if (direction === 'out' && currentZoom > minZoom) {
        currentZoom = Math.max(currentZoom / 1.25, minZoom);
    }
    
    const diagram = document.querySelector('.mermaid');
    if (diagram) {
        diagram.style.zoom = currentZoom;
        diagram.style.transform = `scale(${currentZoom})`;
        diagram.style.transformOrigin = 'top left';
        
        const container = document.getElementById('mermaid-diagram');
        if (container) {
            container.style.minHeight = `${100 * currentZoom}%`;
        }
    }
    
    updateZoomDisplay();
}

function updateZoomDisplay() {
    const zoomDisplay = document.getElementById('zoom-display');
    if (zoomDisplay) {
        zoomDisplay.textContent = `${Math.round(currentZoom * 100)}%`;
    }
}

// Helper Functions
function getDefaultDiagram() {
    return `graph TD
    A[Start] --> B[Process]
    B --> C[End]`;
}

function formatMermaidContent(content) {
    return content
        .split('\n')
        .map(line => line.replace(/\/\/.*$/, '').trim())
        .filter(line => line)
        .join('\n');
}

function showErrorMessage(message) {
    const errorContainer = document.getElementById('error-container') || createErrorContainer();
    errorContainer.textContent = `Diagram Error: ${message}`;
    errorContainer.style.display = 'block';
}

function clearErrorMessage() {
    const errorContainer = document.getElementById('error-container');
    if (errorContainer) {
        errorContainer.style.display = 'none';
    }
}

function createErrorContainer() {
    const container = document.createElement('div');
    container.id = 'error-container';
    container.className = 'error-message';
    document.getElementById('viewer-container').prepend(container);
    return container;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}