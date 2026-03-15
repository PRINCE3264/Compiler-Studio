import React, { useState, useEffect } from 'react';
import { Terminal, History, Database, Layers, Code, Play } from 'lucide-react';
import Swal from 'sweetalert2';
import CodeEditor from '../components/CodeEditor';
import ErrorList from '../components/ErrorList';
import TokenTable from '../components/TokenTable';
import { analyzeCode, getHistory } from '../services/apiService';

const AnalyzerPage = () => {
    const [language, setLanguage] = useState('cpp');
    const [code, setCode] = useState('// Enter code here\n#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << "Sum = " << (a + b) << endl;\n    return 0;\n}');
    const [userInput, setUserInput] = useState('');
    const [results, setResults] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const defaultSnippets = {
        c: '#include <stdio.h>\n\nint main() {\n    printf("Hello World\\n");\n    return 0;\n}',
        cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << "Sum = " << (a + b) << endl;\n    return 0;\n}',
        java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java!");\n    }\n}',
        python: 'print("Hello from Python!")\na = int(input())\nb = int(input())\nprint(f"Sum = {a + b}")'
    };

    const handleLanguageChange = (lang) => {
        setLanguage(lang);
        setCode(defaultSnippets[lang]);
    };

    const handleReset = () => {
        setCode(defaultSnippets[language]);
        setUserInput('');
        setResults(null);
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'info',
            title: 'Studio Reset',
            showConfirmButton: false,
            timer: 1500,
            background: '#ffffff',
            color: '#0f172a'
        });
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const resp = await getHistory();
            setHistory(resp.data);
        } catch (e) {
            console.error('Failed to load history');
        }
    };

    const openInputPopup = async () => {
        const { value: text } = await Swal.fire({
            title: 'Configure Runtime STDIN',
            input: 'textarea',
            inputLabel: 'Provide values for cin >> separated by spaces/newlines',
            inputValue: userInput,
            inputPlaceholder: 'e.g. 10 20 admin',
            showCancelButton: true,
            background: '#ffffff',
            color: '#0f172a',
            confirmButtonColor: '#2563eb',
            inputAttributes: {
                'spellcheck': 'false'
            }
        });

        if (text !== undefined) {
            setUserInput(text);
        }
        return text;
    };

    const handleAnalyze = () => handleAnalyzeWithInput(userInput);

    const handleAnalyzeWithInput = async (currentInput) => {
        const inputKeywords = ['cin', 'input', 'scanf', 'Scanner', '.next'];
        const needsInput = inputKeywords.some(kw => code.includes(kw));

        if (needsInput && currentInput.trim() === '') {
            const result = await openInputPopup();
            if (result === undefined) return; 
            currentInput = result;
        }

        setLoading(true);
        try {
            const response = await analyzeCode(code, currentInput, language);
            const data = response.data;
            setResults(data);

            const allErrors = data.analysis.errors || [];
            if (allErrors.length > 0) {
                const hasCritical = allErrors.some(e => e.type === 'SYNTAX' || e.type === 'SEMANTIC');
                const runtimeWarns = allErrors.filter(e => e.type === 'RUNTIME').length;

                Swal.fire({
                    title: hasCritical ? 'Analysis Issues' : 'Runtime Notice',
                    text: `Found ${allErrors.length} issues in your code.`,
                    icon: hasCritical ? 'error' : 'warning',
                    confirmButtonText: 'Review',
                    background: '#ffffff',
                    color: '#0f172a',
                    confirmButtonColor: '#2563eb'
                }).then(async (result) => {
                    if (result.isConfirmed && runtimeWarns > 0 && !hasCritical) {
                        const input = await openInputPopup();
                        if (input !== undefined) handleAnalyzeWithInput(input);
                    }
                });
            } else {
                const varEntries = Object.entries(data.analysis.variables || {});
                const varHtml = varEntries.length > 0 ? `
                    <div style="margin-top: 1.5rem; padding-top: 1.2rem; border-top: 1px solid rgba(255,255,255,0.08);">
                        <div style="font-family: 'Inter', sans-serif; font-size: 0.65rem; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.8rem;">Runtime Stack (Watch)</div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px;">
                            ${varEntries.map(([name, val]) => `
                                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 8px 12px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                    <div style="font-size: 0.65rem; color: #475569; font-weight: 600;">${name}</div>
                                    <div style="font-size: 0.95rem; color: #10b981; font-weight: 700; font-family: 'Fira Code', monospace;">${val}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : '';

                Swal.fire({
                    title: '<span style="color: #0f172a; font-weight: 800; letter-spacing: -0.02em;">Analysis Success!</span>',
                    html: `
                        <style>
                            @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
                            .terminal-cursor { display: inline-block; width: 8px; height: 1.2em; background: #38bdf8; margin-left: 4px; vertical-align: middle; animation: blink 1s infinite; }
                            .premium-terminal {
                                background: linear-gradient(135deg, #020617 0%, #0f172a 100%);
                                border-radius: 20px;
                                padding: 1.8rem;
                                position: relative;
                                border: 1px solid rgba(255,255,255,0.08);
                                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5), inset 0 0 40px rgba(56, 189, 248, 0.03);
                                max-height: 450px;
                                overflow-y: auto;
                                margin-top: 1rem;
                                text-align: left;
                                scrollbar-width: thin;
                            }
                        </style>
                        <div style="margin-top: 0.5rem;">
                            <p style="font-size: 0.9rem; color: #64748b; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;">
                                <span style="display: inline-block; width: 10px; height: 10px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 12px #22c55e;"></span>
                                Logic verification complete. Output simulated below.
                            </p>
                            <div class="premium-terminal">
                                <div style="position: sticky; top: -10px; left: 0; display: flex; gap: 8px; background: transparent; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 15px; align-items: center;">
                                     <div style="width: 10px; height: 10px; border-radius: 50%; background: #ff5f56; box-shadow: 0 0 5px #ff5f56;"></div>
                                     <div style="width: 10px; height: 10px; border-radius: 50%; background: #ffbd2e; box-shadow: 0 0 5px #ffbd2e;"></div>
                                     <div style="width: 10px; height: 10px; border-radius: 50%; background: #27c93f; box-shadow: 0 0 5px #27c93f;"></div>
                                     <span style="margin-left: auto; font-family: 'Inter', sans-serif; font-size: 0.65rem; color: #475569; letter-spacing: 0.1em; font-weight: 700;">RUNTIME ENVIRONMENT</span>
                                </div>
                                <div id="terminal-v3" style="margin-bottom: 1.5rem;">
                                    <pre style="margin: 0; font-family: 'Fira Code', 'Consolas', monospace; font-size: 1.05rem; color: #f1f5f9; white-space: pre-wrap; word-break: break-all; line-height: 1.7; text-shadow: 0 0 15px rgba(56, 189, 248, 0.2);">${data.analysis.simulatedOutput}<span class="terminal-cursor"></span></pre>
                                </div>
                                ${varHtml}
                                <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between;">
                                     <div style="font-family: 'Inter', sans-serif; font-size: 0.75rem; color: #10b981; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                                         <i style="border: 4px solid transparent; border-left: 7px solid #10b981; display: inline-block; vertical-align: middle;"></i> SUCCESS
                                     </div>
                                     <div style="font-family: 'Fira Code', monospace; font-size: 0.7rem; color: #334155;">
                                         [STATUS: 0]
                                     </div>
                                </div>
                            </div>
                        </div>
                    `,
                    icon: 'success',
                    background: '#ffffff',
                    color: '#0f172a',
                    showCancelButton: true,
                    showDenyButton: true,
                    confirmButtonText: 'Perfect',
                    denyButtonText: 'Run Again',
                    cancelButtonText: 'Edit Input',
                    confirmButtonColor: '#2563eb',
                    denyButtonColor: '#10b981',
                    cancelButtonColor: '#64748b',
                    width: '550px',
                }).then(async (result) => {
                    if (result.isDenied) {
                        handleAnalyze();
                    } else if (result.dismiss === Swal.DismissReason.cancel) {
                        const input = await openInputPopup();
                        if (input !== undefined) handleAnalyzeWithInput(input);
                    }
                });
            }
            fetchHistory();
        } catch (error) {
            console.error('Analysis failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="analyzer-container">
            <aside className="sidebar">
                <div className="logo">
                    <Terminal size={24} />
                    <span>Compiler Studio</span>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>
                        <History size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                        RECENT ANALYSIS
                    </div>
                    <div className="history-scroll-container" style={{ flex: 1, overflowY: 'auto' }}>
                        {history.map((item, idx) => (
                            <div key={idx} className="history-item" onClick={() => { setCode(item.code); setUserInput(item.userInput || ""); }}>
                                {item._id.slice(-6)}: {item.code.substring(0, 20)}...
                            </div>
                        ))}
                    </div>
                </nav>

                <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '0.7rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '4px 8px', borderRadius: '4px' }}>
                        <Database size={10} style={{ marginRight: '4px' }} /> Connected
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>Analyzer Studio</h2>
                        <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>Semantic analysis and logic simulation.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <select 
                            value={language} 
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            style={{ 
                                background: 'white', 
                                border: '1px solid #e2e8f0', 
                                padding: '8px 12px', 
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                color: '#0f172a',
                                fontWeight: '500',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="c">C</option>
                            <option value="cpp">C++</option>
                            <option value="java">Java</option>
                            <option value="python">Python</option>
                        </select>
                        <button onClick={openInputPopup} className="analyze-btn" style={{ background: 'white', color: '#64748b', border: '1px solid #e2e8f0' }}>
                            <Database size={14} /> {userInput ? 'Change Input' : 'Set Input'}
                        </button>
                        <button onClick={handleReset} className="analyze-btn" style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca' }}>
                             Reset
                        </button>
                    </div>
                </header>

                <div className="dashboard-grid">
                    <div className="glass-panel">
                        <div className="panel-header">
                            <span className="panel-title"><Code size={16} /> Editor</span>
                            <button onClick={handleAnalyze} className="analyze-btn" disabled={loading}>
                                <Play size={16} fill="white" /> {loading ? '...' : 'Run'}
                            </button>
                        </div>
                        <div className="editor-wrapper">
                            <CodeEditor code={code} setCode={setCode} onAnalyze={handleAnalyze} />
                        </div>
                    </div>

                    <div className="glass-panel">
                        <div className="panel-header">
                            <span className="panel-title"><Layers size={16} /> Results</span>
                        </div>
                        <div className="results-tabs">
                            <ErrorList errors={results?.analysis?.errors || results?.errors} />
                            {results && <TokenTable tokens={results.tokens} />}
                            {results?.analysis?.variables && Object.keys(results.analysis.variables).length > 0 && (
                                <div className="glass-panel" style={{ marginTop: '1rem', border: 'none', background: 'rgba(255,255,255,0.02)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>
                                        <Database size={14} /> LOGIC TRACE (VARIABLE STATES)
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
                                        {Object.entries(results.analysis.variables).map(([name, val], i) => (
                                            <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>{name}</div>
                                                <div style={{ fontSize: '1rem', color: '#e2e8f0', fontWeight: 600 }}>{val}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AnalyzerPage;
