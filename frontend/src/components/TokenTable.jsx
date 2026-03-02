import React from 'react';
import { Layers } from 'lucide-react';

const TokenTable = ({ tokens }) => {
    if (!tokens || tokens.length === 0) return null;

    return (
        <div className="token-table">
            <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--accent-color)' }}>TOKENIZED SYMBOLS ({tokens.length})</h3>
            <div className="token-list">
                {tokens.map((token, index) => (
                    <div key={index} className="token-badge">
                        <div className="token-type">{token.type}</div>
                        <div style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '1rem' }}>{token.value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TokenTable;
