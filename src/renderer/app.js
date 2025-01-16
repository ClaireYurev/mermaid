import * as monaco from 'monaco-editor';

let editor;
let currentZoom = 1.0;

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

        // Symbols that can be used in operators
        operatorSymbols: /--|->|==>|\.|::|:/,

        tokenizer: {
            root: [
                // Keywords
                [/[a-zA-Z_$][\w$]*/, {
                    cases: {
                        '@keywords': 'keyword',
                        '@typeKeywords': 'type',
                        '@default': 'identifier'
                    }
                }],

                // Strings
                [/"([^"\\]|\\.)*$/, 'string.invalid'],
                [/"/, { token: 'string.quote', next: '@string' }],

                // Comments
                [/%%.*$/, 'comment'],
                
                // Operators (using operatorSymbols)
                [/@operatorSymbols/, 'operator'],

                // Numbers
                [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
                [/\d+/, 'number'],

                // Delimiters
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
        value: '// Your Mermaid diagram code here\ngraph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Result 1]\n    B -->|No| D[Result 2]',
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
        lineHeight: 21
    });

    // Add change listener for real-time preview
    editor.onDidChangeModelContent(debounce(() => {
        const content = editor.getValue();
        updateMermaidDiagram(content);
    }, 500));

    // Handle editor visibility toggle
    document.getElementById('toggleEditor').addEventListener('click', () => {
        const editorContainer = document.getElementById('editor-container');
        const isHidden = editorContainer.classList.contains('hidden');
        
        editorContainer.classList.toggle('hidden');
        if (!isHidden) {
            document.getElementById('viewer-container').style.width = '100%';
        } else {
            document.getElementById('viewer-container').style.width = '60%';
            editor.layout(); // Refresh editor layout
        }
    });
}

// Debounce function to prevent too frequent updates
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

// Initialize editor when window loads
window.addEventListener('load', initializeMonaco);

// Handle file opening
window.electron.onFileOpened(({ content, filePath }) => {
    if (editor) {
        editor.setValue(content);
        document.title = `Mermaid Viewer - ${filePath}`;
    }
});

// Function to update Mermaid diagram (to be implemented)
function updateMermaidDiagram(content) {
    // This will be implemented in the next step
    console.log('Diagram update:', content);
}