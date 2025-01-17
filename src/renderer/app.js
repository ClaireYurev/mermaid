import * as monaco from 'monaco-editor';
import mermaid from 'mermaid';

const resizeObserverError = error => {
    if (error.message === 'ResizeObserver loop completed with undelivered notifications.') {
        // Ignore this false positive
        return;
    }
    // Log other errors as usual
    console.error(error);
};

window.addEventListener('error', event => {
    if (event.error instanceof Error) {
        resizeObserverError(event.error);
    }
});

let editor;
let currentZoom = 1.0;

// panning variables
let isPanning = false;
let lastX;
let lastY;

// Initialize Mermaid with production settings
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

// Wait for DOM and APIs to be ready
document.addEventListener('DOMContentLoaded', async () => {
    await initializeMonaco();
    setupEventListeners();
    setupResizableDivider();
    updateViewControlsPosition();
});

// Initialize Monaco Editor
async function initializeMonaco() {
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

    // Create Monaco editor instance with improved settings
    editor = monaco.editor.create(document.getElementById('monaco-editor'), {
        value: getDefaultDiagram(),
        language: 'mermaid',
        theme: 'vs-light',
        minimap: { enabled: false },
        automaticLayout: true,
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

    // Initial render
    const content = editor.getValue();
    await updateMermaidDiagram(content);

    // Add change listener with debounce
    editor.onDidChangeModelContent(debounce(async () => {
        const content = editor.getValue();
        await updateMermaidDiagram(content);
    }, 300));
}

async function updateMermaidDiagram(content) {
    const mermaidContainer = document.getElementById('mermaid-diagram');
    if (!mermaidContainer) return;
    
    try {
        // Clear previous diagram
        mermaidContainer.innerHTML = '';
        
        // Create new diagram container
        const diagramDiv = document.createElement('div');
        diagramDiv.className = 'mermaid';
        diagramDiv.style.zoom = currentZoom;
        diagramDiv.textContent = formatMermaidContent(content);
        
        // Add to container
        mermaidContainer.appendChild(diagramDiv);
        
        // Render with proper error handling
        await mermaid.run();
        clearErrorMessage();
        
    } catch (error) {
        console.error('Mermaid rendering error:', error);
        showErrorMessage(error.message);
    }
}

function setupResizableDivider() {
    const editorContainer = document.getElementById('editor-container');
    const viewerContainer = document.getElementById('viewer-container');
    const divider = document.querySelector('.divider');
    let isDragging = false;

    divider.addEventListener('mousedown', (e) => {
        isDragging = true;
        divider.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        // Prevent text selection while dragging
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const containerWidth = document.querySelector('.main-content').offsetWidth;
        let newWidth = e.clientX;

        // Enforce minimum width of 100px from left side
        newWidth = Math.max(100, newWidth);
        // Enforce maximum width (prevent going too far right)
        newWidth = Math.min(newWidth, containerWidth - 200);

        // Set the new width as a percentage
        const widthPercentage = (newWidth / containerWidth) * 100;
        editorContainer.style.width = `${widthPercentage}%`;
        
        // Update view controls position
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

function setupToolToggle() {
    const toggleButton = document.getElementById('toggleTool');
    const viewerContainer = document.getElementById('viewer-container');
    
    toggleButton.addEventListener('click', () => {
        toggleButton.classList.toggle('active');
        // const isPanMode = toggleButton.classList.contains('active'); Deprecated.
        const isSelectMode = toggleButton.classList.contains('active');
        // toggleButton.title = isPanMode ? 'Switch to Select Tool' : 'Switch to Pan Tool'; Deprecated
        toggleButton.title = isSelectMode ? 'Switch to Pan Tool' : 'Switch to Select Tool';
        // viewerContainer.style.cursor = isPanMode ? 'grab' : 'default'; Deprecated
        viewerContainer.style.cursor = isSelectMode ? 'default' : 'grab';

        // Toggle visibility of icons
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

function setupEventListeners() {
    // Setup resizable divider
    setupResizableDivider();
    
    // Editor toggle
    document.getElementById('toggleEditor')?.addEventListener('click', () => {
        const editorContainer = document.getElementById('editor-container');
        const isHidden = editorContainer.classList.contains('hidden');
        
        editorContainer.classList.toggle('hidden');
        if (!isHidden) {
            document.getElementById('viewer-container').style.width = '100%';
        } else {
            document.getElementById('viewer-container').style.width = '60%';
            editor?.layout();
        }

        // Update view-controls position after toggle
        updateViewControlsPosition();
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

    // Set up tool toggle and pan controls
    setupToolToggle();

    // Save file handler (if implemented in electron)
    document.getElementById('saveFile')?.addEventListener('click', () => {
        if (window.electron?.saveFile) {
            window.electron.saveFile(editor.getValue());
        }
    });

    // Handle window resize
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

function updateViewControlsPosition() {
    const viewControls = document.querySelector('.view-controls');
    const editorContainer = document.getElementById('editor-container');
    
    if (viewControls && editorContainer) {
        // Force initial width if not set
        if (!editorContainer.style.width) {
            editorContainer.style.width = '40%';
        }
        const editorWidth = editorContainer.offsetWidth;
        viewControls.style.left = `${editorWidth + 120}px`;
        
        // Ensure the view controls don't go off-screen
        const maxLeft = window.innerWidth - viewControls.offsetWidth - 20;
        const currentLeft = parseInt(viewControls.style.left);
        if (currentLeft > maxLeft) {
            viewControls.style.left = `${maxLeft}px`;
        }
    }
}

// Helper Functions
function getDefaultDiagram() {
    return `graph TD
    A[Start] --> B[Process]
    B --> C[End]`;
}

function formatMermaidContent(content) {
    // Remove comments and trim whitespace
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