exports.check = (ast, code, userInput) => {
    const errors = [];
    const symbolTable = new Map(); // Store { name: type }
    const tokens = ast.body;

    // 1. Syntax: Semicolon & Bracket Checks
    const lines = code.split('\n');
    let openBrackets = 0;
    let openParens = 0;

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        const lineNum = index + 1;

        // Bracket Counting
        openBrackets += (line.match(/{/g) || []).length;
        openBrackets -= (line.match(/}/g) || []).length;
        openParens += (line.match(/\(/g) || []).length;
        openParens -= (line.match(/\)/g) || []).length;

        const isPreprocessor = trimmed.startsWith('#');
        const isBlock = trimmed.endsWith('{') || trimmed.endsWith('}');
        const isControl = trimmed.startsWith('if') || trimmed.startsWith('else') || trimmed.startsWith('while') || trimmed.startsWith('for');
        const isUsing = trimmed.startsWith('using');

        if (trimmed && !isPreprocessor && !isBlock && !isControl && !isUsing && !trimmed.endsWith(';') && !trimmed.startsWith('//')) {
            errors.push({ type: 'SYNTAX', message: `Syntax Error: Missing semicolon at end of line ${lineNum}`, line: lineNum });
        }
    });

    if (openBrackets !== 0) errors.push({ type: 'SYNTAX', message: `Syntax Error: Unclosed curly brace '{' detected.`, line: lines.length });
    if (openParens !== 0) errors.push({ type: 'SYNTAX', message: `Syntax Error: Unclosed parenthesis '(' detected.`, line: lines.length });

    // 2. Semantic: Declarations, Types, Duplicates
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type === 'STRING' || token.type === 'COMMENT' || token.type === 'PREPROCESSOR') continue;

        // Declaration Logic (int x = 10; OR string x;)
        if (token.type === 'KEYWORD' && ['int', 'float', 'string', 'let'].includes(token.value)) {
            const varType = token.value;
            const nextToken = tokens[i + 1];

            if (nextToken && nextToken.type === 'IDENTIFIER') {
                if (symbolTable.has(nextToken.value)) {
                    errors.push({ type: 'SEMANTIC', message: `Semantic Error: Duplicate declaration of variable '${nextToken.value}'.`, line: 1 });
                } else {
                    symbolTable.set(nextToken.value, varType);
                }

                // Initial Assignment: int x = "hello";
                const assignOp = tokens[i + 2];
                if (assignOp?.value === '=') {
                    const val = tokens[i + 3];
                    if (val) {
                        if (varType === 'int' && val.type !== 'NUMBER') {
                            errors.push({ type: 'SEMANTIC', message: `Semantic Error: Type mismatch. Cannot assign ${val.type} to INT variable '${nextToken.value}'.`, line: 1 });
                        } else if (varType === 'string' && val.type !== 'STRING') {
                            errors.push({ type: 'SEMANTIC', message: `Semantic Error: Type mismatch. Cannot assign ${val.type} to STRING variable '${nextToken.value}'.`, line: 1 });
                        }
                    }
                }
            }
        }

        // Assignment to existing variable: age = 22;
        if (token.type === 'IDENTIFIER') {
            const prevToken = tokens[i - 1];
            const nextToken = tokens[i + 1];
            const isDecl = prevToken && ['int', 'float', 'string', 'let'].includes(prevToken.value);

            // It's an assignment like: x = ...
            if (!isDecl && nextToken?.value === '=') {
                const varType = symbolTable.get(token.value);
                const assignedVal = tokens[i + 2];
                if (varType && assignedVal) {
                    if (varType === 'int' && assignedVal.type !== 'NUMBER') {
                        errors.push({ type: 'SEMANTIC', message: `Semantic Error: Type mismatch. '${token.value}' is INT but assigned ${assignedVal.type}.`, line: 1 });
                    } else if (varType === 'string' && assignedVal.type !== 'STRING') {
                        errors.push({ type: 'SEMANTIC', message: `Semantic Error: Type mismatch. '${token.value}' is STRING but assigned ${assignedVal.type}.`, line: 1 });
                    }
                }
            }

            // It's a comparison like: x >= 18
            const nextOp = tokens[i + 1];
            if (!isDecl && ['>', '<', '>=', '<=', '==', '!='].includes(nextOp?.value)) {
                const varType = symbolTable.get(token.value);
                const compareVal = tokens[i + 2];
                if (varType && compareVal) {
                    if (varType === 'string' && compareVal.type === 'NUMBER') {
                        errors.push({ type: 'SEMANTIC', message: `Semantic Error: Cannot compare STRING '${token.value}' with NUMBER ${compareVal.value}.`, line: 1 });
                    } else if (varType === 'int' && compareVal.type === 'STRING') {
                        errors.push({ type: 'SEMANTIC', message: `Semantic Error: Cannot compare INT '${token.value}' with STRING ${compareVal.value}.`, line: 1 });
                    }
                }
            }

            // Usage Check
            const isStandard = ['cout', 'cin', 'endl', 'std', 'main'].includes(token.value);
            const isMember = prevToken?.value === '.' || prevToken?.value === '::';

            if (!isDecl && !isStandard && !isMember && !symbolTable.has(token.value)) {
                errors.push({ type: 'SEMANTIC', message: `Semantic Error: Identifier '${token.value}' is used but not declared.`, line: 1 });
            }
        }
    }

    // 4. Logic-Aware Output Simulation (Enhanced Execution)
    const outputs = [];
    const runtimeVars = new Map();
    const inputValues = (userInput || "").trim().split(/\s+/).filter(Boolean);
    let inputIdx = 0;

    // First pass: Assign input values
    tokens.forEach((t, i) => {
        if (t.value === 'cin') {
            let next = i + 1;
            while (next < tokens.length && tokens[next].value !== ';') {
                if (tokens[next].type === 'IDENTIFIER' && tokens[next].value !== '>>') {
                    if (inputIdx < inputValues.length) {
                        runtimeVars.set(tokens[next].value, inputValues[inputIdx++]);
                    }
                }
                next++;
            }
        }
    });

    // Second pass: Simulation
    let skipMode = "NONE"; // "NONE", "SKIP_IF", "SKIP_ELSE"
    let lastIfResult = null;
    let pendingReset = false;

    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];

        // Track Assignment
        if (t.value === '=' && skipMode === "NONE") {
            const varToken = tokens[i - 1];
            const valToken = tokens[i + 1];
            if (varToken?.type === 'IDENTIFIER' && valToken) {
                let val = valToken.value.replace(/"/g, '');
                runtimeVars.set(varToken.value, val);
            }
        }

        // Branching Logic
        if (t.value === 'if') {
            let j = i + 1;
            let conditionStr = "";
            while (j < tokens.length && tokens[j].value !== '{' && tokens[j].value !== ';') {
                conditionStr += tokens[j].value;
                j++;
            }

            // Simple parse for condition: age>=18
            const match = conditionStr.match(/([a-zA-Z_]\w*)(>=|<=|>|<|==|!=)(\d+)/);
            if (match) {
                const [_, varName, op, threshold] = match;
                const varVal = Number(runtimeVars.get(varName));
                const threshNum = Number(threshold);

                if (!isNaN(varVal)) {
                    lastIfResult = (op === '>' && varVal > threshNum) ||
                        (op === '<' && varVal < threshNum) ||
                        (op === '>=' && varVal >= threshNum) ||
                        (op === '<=' && varVal <= threshNum) ||
                        (op === '==' && varVal == threshNum);

                    if (!lastIfResult) skipMode = "SKIP_IF";
                }
            }
        }

        if (t.value === 'else') {
            if (lastIfResult === true) skipMode = "SKIP_ELSE";
            else skipMode = "NONE";
        }

        // Reset Skip at semicolon or closing brace
        if (t.value === ';' || t.value === '}') {
            // Only reset if we were skipping a specific branch
            if (skipMode !== "NONE") {
                // Heuristic: If we just finished a statement inside if/else
                const nextToken = tokens[i + 1];
                if (nextToken?.value !== 'else') {
                    skipMode = "NONE";
                }
            }
        }

        // Output Collection
        if (t.value === 'cout' && skipMode === "NONE") {
            let nextIdx = i + 1;
            let currentExpression = [];
            while (nextIdx < tokens.length && tokens[nextIdx].value !== ';') {
                const current = tokens[nextIdx];
                if (current.value === '<<') {
                    if (currentExpression.length > 0) {
                        outputs.push(evaluateExpression(currentExpression, runtimeVars));
                        currentExpression = [];
                    }
                } else if (current.value === 'endl') {
                    outputs.push('\n');
                } else {
                    currentExpression.push(current);
                }
                nextIdx++;
            }
            if (currentExpression.length > 0) {
                outputs.push(evaluateExpression(currentExpression, runtimeVars));
            }
        }
    }

    const finalOutput = outputs.join('').replace(/\n /g, '\n').trim();
    return {
        errors: [...new Set(errors.map(e => JSON.stringify(e)))].map(e => JSON.parse(e)),
        simulatedOutput: finalOutput || "Program executed. (No output generated)"
    };
};

/**
 * Helper to evaluate simple expressions like a + b or "Text"
 */
function evaluateExpression(exprTokens, vars) {
    if (exprTokens.length === 0) return "";

    // Handle single tokens
    if (exprTokens.length === 1) {
        const t = exprTokens[0];
        if (t.type === 'STRING') return t.value.replace(/"/g, '');
        if (t.type === 'NUMBER') return t.value;
        if (t.type === 'IDENTIFIER') return vars.get(t.value) || `{${t.value}}`;
        return t.value;
    }

    // Handle binary expressions: a + b
    const values = exprTokens.map(t => {
        if (t.type === 'IDENTIFIER') return Number(vars.get(t.value)) || 0;
        if (t.type === 'NUMBER') return Number(t.value);
        return t.value;
    });

    if (values.length === 3) {
        const [left, op, right] = values;
        if (typeof left === 'number' && typeof right === 'number') {
            if (op === '+') return left + right;
            if (op === '-') return left - right;
            if (op === '*') return left * right;
            if (op === '/') return right !== 0 ? left / right : 'DivByZero';
            if (op === '%') return left % right;
        }
    }

    return exprTokens.map(t => t.value).join('');
}
