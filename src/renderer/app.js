// src/renderer/app.js
import * as monaco from 'monaco-editor';
import mermaid from 'mermaid';

let editor;
let currentZoom = 1.0;

// Basic Mermaid initialization
mermaid.initialize({
    startOnLoad: true,  // Changed to true
    theme: 'default',
    securityLevel: 'loose'
});

// Wait for DOM and APIs to be ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded');
    await initializeMonaco();
    setupEventListeners();
    
    // Test render a simple diagram
    const testDiagram = `graph TD
    A[Start] --> B[End]`;
    
    try {
        console.log('Attempting to render test diagram...');
        const mermaidContainer = document.getElementById('mermaid-diagram');
        mermaidContainer.innerHTML = `<div class="mermaid">
            ${testDiagram}
        </div>`;
        
        await mermaid.run();
        console.log('Test diagram rendered successfully');
    } catch (error) {
        console.error('Failed to render test diagram:', error);
    }
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

    // Create Monaco editor instance
    editor = monaco.editor.create(document.getElementById('monaco-editor'), {
        value: `graph TD
    A[Global Digital Economy] --> B[AI and ML Market]
    A --> C[Remote Work Tech]
    A --> D[EdTech]
    A --> E[Blockchain]
    A --> F[IoT]
    A --> G[Digital Mental Health]
    A --> H[AR/VR]
    
    B --> B1[2025 Projection: $190B]
    C --> C1[2025 Projection: $80B]
    D --> D1[2025 Projection: $400B]
    E --> E1[2025 Projection: $40B]
    F --> F1[2025 Projection: $1.6T]
    G --> G1[2025 Projection: $30B]
    H --> H1[2025 Projection: $300B]`,
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
        formatOnType: true
    });

    // Initial render of the diagram
    const content = editor.getValue();
    await updateMermaidDiagram(content);

    // Add change listener for real-time preview
    editor.onDidChangeModelContent(debounce(async () => {
        const content = editor.getValue();
        await updateMermaidDiagram(content);
    }, 500));
}

// Set up event listeners
function setupEventListeners() {
    // Handle editor visibility toggle
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

    // Add zoom button handlers
    document.getElementById('zoomIn')?.addEventListener('click', () => handleZoom('in'));
    document.getElementById('zoomOut')?.addEventListener('click', () => handleZoom('out'));

    // Handle file opening if electron API is available
    if (window.electron?.onFileOpened) {
        window.electron.onFileOpened(({ content, filePath }) => {
            if (editor) {
                editor.setValue(content);
                document.title = `Mermaid Viewer - ${filePath}`;
            }
        });
    }
}

// Simplified updateMermaidDiagram function
async function updateMermaidDiagram(content) {
    console.log('Updating diagram with content:', content);
    const mermaidContainer = document.getElementById('mermaid-diagram');
    
    try {
        // Clear previous diagram
        mermaidContainer.innerHTML = '';
        
        // Create new diagram container
        const diagramDiv = document.createElement('div');
        diagramDiv.className = 'mermaid';
        diagramDiv.textContent = content;
        
        // Add to container
        mermaidContainer.appendChild(diagramDiv);
        
        // Render
        console.log('Running mermaid...');
        await mermaid.run();
        console.log('Mermaid run complete');
        
    } catch (error) {
        console.error('Mermaid rendering error:', error);
        showErrorMessage(`Rendering error: ${error.message}`);
    }
}

// Format the Mermaid content
function formatMermaidContent(content) {
    // Remove any existing comments
    let formatted = content.replace(/\/\/.*$/gm, '');
    
    // Remove extra whitespace and empty lines
    formatted = formatted.split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .join('\n');
    
    // Ensure the graph TD is on its own line
    formatted = formatted.replace(/^(\s*graph\s+TD\s*)(.+)/, '$1\n$2');
    
    return formatted;
}

// Error handling
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

// Zoom handling
function handleZoom(direction) {
    const zoomStep = 0.1;
    const minZoom = 0.1;
    const maxZoom = 2.0;
    
    if (direction === 'in' && currentZoom < maxZoom) {
        currentZoom = Math.min(currentZoom + zoomStep, maxZoom);
    } else if (direction === 'out' && currentZoom > minZoom) {
        currentZoom = Math.max(currentZoom - zoomStep, minZoom);
    }
    
    const diagram = document.querySelector('.mermaid');
    if (diagram) {
        diagram.style.zoom = currentZoom;
    }
}

// Debounce to prevent overly frequent updates
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