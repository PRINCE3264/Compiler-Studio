import React, { useRef, useEffect } from 'react';
import { Copy, Trash2 } from 'lucide-react';

const CodeEditor = ({ code, setCode }) => {
    const textareaRef = useRef(null);
    const lineNumbersRef = useRef(null);
    const [activeLine, setActiveLine] = React.useState(1);

    // Sync scroll
    const handleScroll = (e) => {
        if (lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = e.target.scrollTop;
        }
    };

    // Track active line
    const updateActiveLine = (e) => {
        const cursorPosition = e.target.selectionStart;
        const textBeforeCursor = code.substring(0, cursorPosition);
        const currentLine = textBeforeCursor.split('\n').length;
        setActiveLine(currentLine);
    };

    // Tab key support
    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const newValue = code.substring(0, start) + "    " + code.substring(end);
            setCode(newValue);
            setTimeout(() => {
                e.target.selectionStart = e.target.selectionEnd = start + 4;
                updateActiveLine({ target: e.target });
            }, 0);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        // We could add a toast here
    };

    const clearCode = () => {
        setCode('');
        setActiveLine(1);
    };

    const lineCount = code.split('\n').length;
    const lineNumbersItems = Array.from({ length: lineCount }, (_, i) => {
        const lineNum = i + 1;
        return (
            <div
                key={lineNum}
                className={`line-number-item ${activeLine === lineNum ? 'active' : ''}`}
            >
                {lineNum}
            </div>
        );
    });

    return (
        <div className="editor-container" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Toolbar */}
            <div className="editor-toolbar" style={{ display: 'flex', gap: '8px', padding: '8px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', justifyContent: 'flex-end', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
                <button onClick={copyCode} title="Copy Code" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', borderRadius: '4px' }} className="tool-btn">
                    <Copy size={16} />
                </button>
                <button onClick={clearCode} title="Clear Editor" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', borderRadius: '4px' }} className="tool-btn">
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="editor-main" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <div
                    ref={lineNumbersRef}
                    className="line-numbers-enhanced"
                >
                    {lineNumbersItems}
                </div>
                <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onScroll={handleScroll}
                    onKeyDown={handleKeyDown}
                    onClick={updateActiveLine}
                    onKeyUp={updateActiveLine}
                    placeholder="// Enter your source code here..."
                    className="editor-textarea-enhanced"
                    spellCheck="false"
                />
            </div>
        </div>
    );
};

export default CodeEditor;
