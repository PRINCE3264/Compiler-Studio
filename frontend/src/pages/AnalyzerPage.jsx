import React, { useState, useEffect } from 'react';
import { Terminal, History, Database, Layers, Code, Play, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import CodeEditor from '../components/CodeEditor';
import ErrorList from '../components/ErrorList';
import TokenTable from '../components/TokenTable';
import { analyzeCode, getHistory } from '../services/apiService';

const AnalyzerPage = () => {
    const inputRef = React.useRef(null);
    const [code, setCode] = useState('// Enter code here\nlet x = 10;');
    const [userInput, setUserInput] = useState('');
    const [results, setResults] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

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

    const handleAnalyze = async () => {
        setLoading(true);
        try {
            const response = await analyzeCode(code, userInput);
            const data = response.data;
            setResults(data);

            const allErrors = data.analysis.errors;
            if (allErrors.length > 0) {
                const syntaxCount = allErrors.filter(e => e.type === 'SYNTAX').length;
                const semanticCount = allErrors.filter(e => e.type === 'SEMANTIC').length;
                const runtimeWarns = allErrors.filter(e => e.type === 'RUNTIME').length;

                let statusMsg = `Found ${allErrors.length} issues in your code:\n`;
                if (syntaxCount > 0) statusMsg += `• ${syntaxCount} Syntax Grammer Errors\n`;
                if (semanticCount > 0) statusMsg += `• ${semanticCount} Logical Meaning Errors\n`;
                if (runtimeWarns > 0) statusMsg += `• ${runtimeWarns} Runtime Data Warnings\n`;

                Swal.fire({
                    title: allErrors.some(e => e.type !== 'RUNTIME') ? 'Analysis Failed' : 'Runtime Attention Needed',
                    text: statusMsg,
                    icon: allErrors.some(e => e.type !== 'RUNTIME') ? 'error' : 'warning',
                    confirmButtonText: 'Review Errors',
                    background: '#ffffff',
                    color: '#0f172a',
                    confirmButtonColor: '#2563eb'
                }).then((result) => {
                    if (result.isConfirmed && runtimeWarns > 0) {
                        // If runtime is the issue, help them open it
                        const hasSyntaxOrSemantic = allErrors.some(e => e.type === 'SYNTAX' || e.type === 'SEMANTIC');
                        if (!hasSyntaxOrSemantic) openInputPopup();
                    }
                });
            } else {
                Swal.fire({
                    title: 'Analysis Success!',
                    html: `
                        <div style="text-align: left; margin-top: 1.5rem;">
                            <p style="font-size: 0.85rem; color: #475569; margin-bottom: 0.8rem;">The code is semantically valid. Expected output:</p>
                            ${data.analysis.simulatedOutput ? `
                                <div style="background: #0f172a; border-radius: 12px; padding: 1.5rem; position: relative; border: 1px solid #1e293b; box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);">
                                    <div style="position: absolute; top: 12px; left: 15px; display: flex; gap: 6px;">
                                        <div style="width: 8px; height: 8px; border-radius: 50%; background: #ff5f56;"></div>
                                        <div style="width: 8px; height: 8px; border-radius: 50%; background: #ffbd2e;"></div>
                                        <div style="width: 8px; height: 8px; border-radius: 50%; background: #27c93f;"></div>
                                    </div>
                                    <pre style="margin: 1rem 0 0 0; font-family: 'Fira Code', monospace; font-size: 0.95rem; color: #38bdf8; white-space: pre-wrap; word-break: break-all;">
${data.analysis.simulatedOutput}
                                    </pre>
                                </div>
                            ` : `
                                <div style="padding: 1rem; background: #f1f5f9; border-radius: 8px; color: #64748b; font-style: italic; text-align: center;">
                                    Perfect logic! (No display output found)
                                </div>
                            `}
                        </div>
                    `,
                    icon: 'success',
                    background: '#ffffff',
                    color: '#0f172a',
                    confirmButtonText: 'Great!',
                    confirmButtonColor: '#2563eb',
                    width: '500px'
                });
            }

            fetchHistory(); // Refresh history
        } catch (error) {
            console.error('Analysis failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const openInputPopup = async () => {
        const { value: text } = await Swal.fire({
            title: 'Configure Runtime STDIN',
            input: 'textarea',
            inputLabel: 'Provide values for cin >> or input() separated by spaces/newlines',
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
                    <div className="history-scroll-container" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                        {history.map((item, idx) => (
                            <div key={idx} className="history-item" onClick={() => { setCode(item.code); setUserInput(item.userInput || ""); }}>
                                {item._id.slice(-6)}: {item.code.substring(0, 20)}...
                            </div>
                        ))}
                        {history.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No history yet.</p>}
                    </div>
                </nav>



                <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '0.7rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '4px 8px', borderRadius: '4px' }}>
                        <Database size={10} style={{ marginRight: '4px' }} /> MongoDB Connected
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: '1', minWidth: '300px' }}>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>Syntax & Semantic Analyzer</h2>
                        <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>Develop, debug and analyze your compiler designs in real-time.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {userInput && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--success-color)', background: 'rgba(34, 197, 94, 0.1)', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                <Database size={12} style={{ marginRight: '4px' }} /> STDIN READY
                            </div>
                        )}
                        <button
                            onClick={openInputPopup}
                            className="analyze-btn"
                            style={{
                                padding: '0.6rem 1.2rem',
                                background: userInput ? 'var(--primary-gradient)' : 'white',
                                color: userInput ? 'white' : 'var(--text-secondary)',
                                border: userInput ? 'none' : '1px solid #e2e8f0',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                fontSize: '0.85rem'
                            }}
                        >
                            <Database size={14} color={userInput ? 'white' : '#64748b'} /> {userInput ? 'Change Input' : 'Set Runtime Input'}
                        </button>
                    </div>
                </header>

                <div className="dashboard-grid">
                    <div className="glass-panel">
                        <div className="panel-header">
                            <span className="panel-title"><Code size={16} /> Source Editor</span>
                            <button onClick={handleAnalyze} className="analyze-btn" disabled={loading}>
                                <Play size={16} fill="white" /> {loading ? 'Running...' : 'Run Analysis'}
                            </button>
                        </div>
                        <div className="editor-wrapper">
                            <CodeEditor code={code} setCode={setCode} onAnalyze={handleAnalyze} />
                        </div>
                    </div>

                    <div className="glass-panel" style={{ overflow: 'hidden' }}>
                        <div className="panel-header">
                            <span className="panel-title"><Layers size={16} fill="currentColor" /> Results & Insights</span>
                            {results?.analysis?.errors?.some(e => e.message.includes('Runtime Warning')) && (
                                <button onClick={() => inputRef.current?.focus()} style={{ background: 'orange', color: 'black', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>
                                    Open Input Box
                                </button>
                            )}
                        </div>
                        <div className="results-tabs">
                            <ErrorList errors={results?.analysis?.errors || results?.errors} />
                            {results && <TokenTable tokens={results.tokens} />}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AnalyzerPage;
