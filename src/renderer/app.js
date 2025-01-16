import * as monaco from 'monaco-editor';
import mermaid from 'mermaid';

let editor;
let currentZoom = 1.0;

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

// Update Mermaid diagram with improved error handling
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

function setupEventListeners() {
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
    if (!zoomDisplay) {
        const toolbar = document.querySelector('.toolbar');
        const display = document.createElement('span');
        display.id = 'zoom-display';
        display.className = 'zoom-display';
        toolbar.appendChild(display);
    }
    document.getElementById('zoom-display').textContent = `${Math.round(currentZoom * 100)}%`;
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