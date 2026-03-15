import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const ErrorList = ({ errors }) => {
    if (!errors || errors.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', textAlign: 'center' }}>
                <CheckCircle2 color="#22c55e" size={48} />
                <h4 style={{ marginTop: '1rem' }}>Everything Looks Good!</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No syntax or semantic errors detected in the current code.</p>
            </div>
        );
    }

    return (
        <div className="error-list-container">
            <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#fca5a5' }}>ERRORS FOUND ({errors.length})</h3>
            {errors.map((error, index) => {
                const isWarning = error.message.toLowerCase().includes('warning');
                return (
                    <div key={index} className={`error-card ${isWarning ? 'warning' : ''}`} style={{ animationDelay: `${index * 0.1}s` }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <AlertTriangle size={18} color={isWarning ? "#f59e0b" : "#ef4444"} style={{ marginTop: '2px' }} />
                            <div style={{ flex: 1 }}>
                                <div className="error-msg" style={{ fontWeight: 600 }}>{error.message}</div>
                                <div className="error-pos">Line {error.line} • {isWarning ? 'Logic Advice' : 'Compilation Issue'}</div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ErrorList;
