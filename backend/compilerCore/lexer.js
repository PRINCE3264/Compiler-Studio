exports.tokenize = (code) => {
    const tokens = [];
    const rules = [
        { type: 'COMMENT', pattern: /\/\/.*/, skip: true },
        { type: 'MARKDOWN', pattern: /```[a-zA-Z0-9=" ]*/, skip: true },
        { type: 'STRING', pattern: /f?"(?:\\.|[^\\"])*"/ },
        { type: 'PREPROCESSOR', pattern: /#include\s*<[a-zA-Z.]+>/ },
        { type: 'KEYWORD', pattern: /\b(let|int|float|double|long|char|bool|boolean|string|String|Scanner|new|if|else|while|for|return|using|namespace|void|main|std|cout|cin|endl|public|static|class|interface|import|package|extends|implements|System\.out\.println|print|printf|scanf|def|lambda|from|as|with|try|except|finally|pass|None|True|False|true|false|null)\b/ },
        { type: 'IDENTIFIER', pattern: /\b[a-zA-Z_][a-zA-Z0-9_]*\b/ },
        { type: 'NUMBER', pattern: /\b\d+(\.\d+)?\b/ },
        { type: 'OPERATOR', pattern: /(<<|>>|==|!=|<=|>=|≤|≥|\+\+|--|[=+\-*/<>!%&|^~])+/ },
        { type: 'SYMBOL', pattern: /[;(){},.:]/ },
        { type: 'WHITESPACE', pattern: /\s+/, skip: true }
    ];

    let cursor = 0;
    let line = 1;
    while (cursor < code.length) {
        let match = null;
        for (const rule of rules) {
            const regex = new RegExp(`^${rule.pattern.source}`);
            const substr = code.slice(cursor);
            const found = substr.match(regex);

            if (found) {
                match = { type: rule.type, value: found[0], skip: rule.skip };
                
                // Track lines in the matched content (for multi-line strings/comments if any)
                const linesInMatch = (found[0].match(/\n/g) || []).length;
                
                if (match.skip) {
                    cursor += found[0].length;
                    line += linesInMatch;
                } else {
                    let finalType = match.type;
                    if (match.type === 'SYMBOL') {
                        if (match.value === '(') finalType = 'PAREN_OPEN';
                        else if (match.value === ')') finalType = 'PAREN_CLOSE';
                        else if (match.value === '{') finalType = 'BRACE_OPEN';
                        else if (match.value === '}') finalType = 'BRACE_CLOSE';
                        else if (match.value === ';') finalType = 'SEMICOLON';
                        else if (match.value === ',') finalType = 'COMMA';
                    }
                    tokens.push({ type: finalType, value: match.value, line: line });
                    cursor += found[0].length;
                    line += linesInMatch;
                }
                break;
            }
        }

        if (!match) {
            // Unknown character
            if (code[cursor] === '\n') line++;
            cursor++;
        }
    }
    return tokens;
};
