exports.tokenize = (code) => {
    const tokens = [];
    const rules = [
        { type: 'COMMENT', pattern: /\/\/.*/, skip: true },
        { type: 'STRING', pattern: /"(?:\\.|[^\\"])*"/ },
        { type: 'PREPROCESSOR', pattern: /#include\s*<[a-zA-Z.]+>/ },
        { type: 'KEYWORD', pattern: /\b(let|int|float|string|if|else|while|return|using|namespace|void|main|std|cout|cin|endl)\b/ },
        { type: 'IDENTIFIER', pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/ },
        { type: 'NUMBER', pattern: /\b\d+(\.\d+)?\b/ },
        { type: 'OPERATOR', pattern: /(<<|>>|==|!=|<=|>=|[=+\-*/<>!])/ },
        { type: 'SYMBOL', pattern: /[;(){},.:]/ },
        { type: 'WHITESPACE', pattern: /\s+/, skip: true }
    ];

    let cursor = 0;
    while (cursor < code.length) {
        let match = null;
        for (const rule of rules) {
            const regex = new RegExp(`^${rule.pattern.source}`);
            const substr = code.slice(cursor);
            const found = substr.match(regex);

            if (found) {
                match = { type: rule.type, value: found[0], skip: rule.skip };
                cursor += found[0].length;
                break;
            }
        }

        if (match) {
            if (!match.skip) {
                let finalType = match.type;
                if (match.type === 'SYMBOL') {
                    if (match.value === '(') finalType = 'PAREN_OPEN';
                    else if (match.value === ')') finalType = 'PAREN_CLOSE';
                    else if (match.value === '{') finalType = 'BRACE_OPEN';
                    else if (match.value === '}') finalType = 'BRACE_CLOSE';
                    else if (match.value === ';') finalType = 'SEMICOLON';
                    else if (match.value === ',') finalType = 'COMMA';
                }
                tokens.push({ type: finalType, value: match.value });
            }
        } else {
            // Unknown character
            cursor++;
        }
    }
    return tokens;
};
