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
            {errors.map((error, index) => (
                <div key={index} className="error-card">
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <AlertTriangle size={14} color="#ef4444" />
                        <span className="error-msg">{error.message}</span>
                    </div>
                    <div className="error-pos">Line {error.line}:{error.column}</div>
                </div>
            ))}
        </div>
    );
};

export default ErrorList;
