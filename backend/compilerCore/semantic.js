exports.check = (ast, code, userInput, language = 'cpp') => {
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
        if (!trimmed) return;

        // Bracket Counting
        openBrackets += (line.match(/{/g) || []).length;
        openBrackets -= (line.match(/}/g) || []).length;
        openParens += (line.match(/\(/g) || []).length;
        openParens -= (line.match(/\)/g) || []).length;

        const isPreprocessor = trimmed.startsWith('#') || trimmed.startsWith('import');
        const isBlock = trimmed.endsWith('{') || trimmed.endsWith('}');
        const isControlHead = (trimmed.startsWith('if') || trimmed.startsWith('while') || trimmed.startsWith('for') || trimmed.startsWith('else') || trimmed.startsWith('do') || trimmed.startsWith('switch')) && !trimmed.endsWith(';');
        const isClassHeader = trimmed.startsWith('public') || trimmed.startsWith('class') || trimmed.startsWith('interface') || trimmed.startsWith('private') || trimmed.startsWith('protected');
        const isFunctionHeader = (trimmed.includes('(') && trimmed.includes(')') && !trimmed.includes(';') && (trimmed.startsWith('int') || trimmed.startsWith('void') || trimmed.startsWith('static') || trimmed.startsWith('public') || trimmed.startsWith('float') || trimmed.startsWith('Main') || trimmed.startsWith('String')));
        const isComment = trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('`');

        // Statements that MUST have semicolons
        const isInputOutput = trimmed.includes('cout') || trimmed.includes('cin') || trimmed.includes('printf') || trimmed.includes('scanf') || trimmed.includes('println') || trimmed.includes('print(');
        const isAssignment = trimmed.includes('=') && !trimmed.startsWith('for');
        const isReturn = trimmed.startsWith('return');

        if (!isPreprocessor && !isBlock && !isControlHead && !isClassHeader && !isFunctionHeader && !isComment) {
            if (!trimmed.endsWith(';') && !trimmed.endsWith(',') && language !== 'python') {
                errors.push({ type: 'SYNTAX', message: `Syntax Error: Missing semicolon at end of line ${lineNum}`, line: lineNum });
            }
        }
    });

    if (openBrackets !== 0) errors.push({ type: 'SYNTAX', message: `Syntax Error: Unclosed curly brace '{' detected.`, line: lines.length });
    if (openParens !== 0) errors.push({ type: 'SYNTAX', message: `Syntax Error: Unclosed parenthesis '(' detected.`, line: lines.length });

    // 2. Semantic: Declarations, Types, Duplicates
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type === 'STRING' || token.type === 'COMMENT' || token.type === 'PREPROCESSOR') continue;

        // Declaration Logic (int x = 10; OR string x;)
        if (token.type === 'KEYWORD' && ['int', 'float', 'double', 'long', 'char', 'bool', 'boolean', 'string', 'String', 'Scanner', 'let', 'void'].includes(token.value)) {
            const varType = token.value;
            let current = i + 1;

            while (current < tokens.length && tokens[current].value !== ';') {
                const idToken = tokens[current];
                if (idToken.type === 'IDENTIFIER') {
                    if (symbolTable.has(idToken.value)) {
                        errors.push({ type: 'SEMANTIC', message: `Semantic Error: Duplicate declaration of variable '${idToken.value}'.`, line: idToken.line });
                    } else {
                        symbolTable.set(idToken.value, varType);
                    }

                    // Handle assignment: int x = 10, y = 20;
                    if (tokens[current + 1]?.value === '=') {
                        const val = tokens[current + 2];
                        if (val) {
                            if (varType === 'int' && (val.type !== 'NUMBER' && val.type !== 'IDENTIFIER')) {
                                errors.push({ type: 'SEMANTIC', message: `Semantic Error: Type mismatch. Cannot assign ${val.type} to INT variable '${idToken.value}'.`, line: val.line });
                            } else if (varType === 'string' && val.type !== 'STRING') {
                                errors.push({ type: 'SEMANTIC', message: `Semantic Error: Type mismatch. Cannot assign ${val.type} to STRING variable '${idToken.value}'.`, line: val.line });
                            }
                        }
                        current += 2;
                    }
                } else if (idToken.value === ',') {
                    // Just move to next
                } else if (idToken.value === '(') {
                    // Function header detection - e.g. int main()
                    break;
                }
                current++;
            }
            i = current; // Advance outer loop past this declaration
        }

        // Assignment to existing variable: age = 22;
        if (token.type === 'IDENTIFIER') {
            const prevToken = tokens[i - 1];
            const nextToken = tokens[i + 1];
            const isDecl = prevToken && ['int', 'float', 'double', 'long', 'char', 'bool', 'boolean', 'string', 'String', 'Scanner', 'let', 'class', 'interface', ','].includes(prevToken.value);

            // It's an assignment like: x = ...
            if (!isDecl && nextToken?.value === '=') {
                const varType = symbolTable.get(token.value);
                const assignedVal = tokens[i + 2];
                if (varType && assignedVal) {
                    if (varType === 'int' && (assignedVal.type !== 'NUMBER' && assignedVal.type !== 'IDENTIFIER')) {
                        errors.push({ type: 'SEMANTIC', message: `Semantic Error: Type mismatch. '${token.value}' is INT but assigned ${assignedVal.type}.`, line: token.line });
                    } else if (varType === 'string' && assignedVal.type !== 'STRING') {
                        errors.push({ type: 'SEMANTIC', message: `Semantic Error: Type mismatch. '${token.value}' is STRING but assigned ${assignedVal.type}.`, line: token.line });
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
                        errors.push({ type: 'SEMANTIC', message: `Semantic Error: Cannot compare STRING '${token.value}' with NUMBER ${compareVal.value}.`, line: token.line });
                    } else if (varType === 'int' && compareVal.type === 'STRING') {
                        errors.push({ type: 'SEMANTIC', message: `Semantic Error: Cannot compare INT '${token.value}' with STRING ${compareVal.value}.`, line: token.line });
                    }
                }
            }

            // Usage Check
            const isStandard = ['cout', 'cin', 'endl', 'std', 'main', 'printf', 'scanf', 'String', 'System', 'out', 'println', 'print', 'args', 'java', 'util', 'Scanner', 'in', 'nextInt', 'next', 'self', 'new', 'input', 'int', 'float', 'len', 'range', 'list', 'dict', 'set', 'str', 'type', 'true', 'false', 'null'].includes(token.value);
            const isMember = prevToken?.value === '.' || prevToken?.value === '::';
            const isImport = prevToken?.value === 'import' || (i > 1 && tokens[i-2]?.value === 'import') || prevToken?.value === 'from';

            // Python: Declare on assignment
            if (language === 'python' && nextToken?.value === '=') {
                symbolTable.set(token.value, 'dynamic');
            }

            if (!isDecl && !isStandard && !isMember && !isImport && !symbolTable.has(token.value)) {
                errors.push({ type: 'SEMANTIC', message: `Semantic Error: Identifier '${token.value}' is used but not declared.`, line: token.line });
            }
        }

        // 5. Expression Type Check: Arithmetic on CHAR
        if (token.type === 'OPERATOR' && ['+', '-', '*', '/'].includes(token.value)) {
            const prev = tokens[i - 1];
            const next = tokens[i + 1];
            
            if (prev?.type === 'IDENTIFIER' && next?.type === 'IDENTIFIER') {
                const leftType = symbolTable.get(prev.value);
                const rightType = symbolTable.get(next.value);
                
                if (leftType === 'char' && rightType === 'char' && language === 'cpp') {
                    errors.push({ 
                        type: 'SEMANTIC', 
                        message: `Type Warning: Performing arithmetic on CHAR variables '${prev.value}' and '${next.value}'. If you intended to sum numbers, use INT datatype instead.`, 
                        line: token.line 
                    });
                }
            }
        }
    }

    // 4. Logic-Aware Output Simulation (Enhanced Execution)
    const outputs = [];
    const runtimeVars = new Map();
    const inputValues = (userInput || "").trim().split(/\s+/).filter(Boolean);
    let inputIdx = 0;
    let iterationCount = 0;
    const MAX_ITERATIONS = 1000; // Reduced from 5000
    const MAX_OUTPUT_CHARS = 5000; 
    let currentOutputLength = 0;

    function execSimulation(simTokens) {
        for (let i = 0; i < simTokens.length; i++) {
            if (iterationCount++ > MAX_ITERATIONS) return;
            const t = simTokens[i];

            // 1. Assignment & Standalone Increment: x = 5 + 2; i++;
            // 1a. Variable Declarations (with optional assignment)
            if (t.type === 'KEYWORD' && ['int', 'float', 'double', 'long', 'char', 'bool', 'string', 'let'].includes(t.value)) {
                let j = i + 1;
                let isFunction = false;
                while (j < simTokens.length && simTokens[j].value !== ';') {
                    if (simTokens[j].value === '(') {
                        isFunction = true;
                        break;
                    }
                    if (simTokens[j].type === 'IDENTIFIER') {
                        let varName = simTokens[j].value;
                        if (simTokens[j+1]?.value === '=') {
                            let k = j + 2;
                            let expr = [];
                            while(k < simTokens.length && ![';', ','].includes(simTokens[k].value)) {
                                expr.push(simTokens[k]);
                                k++;
                            }
                            runtimeVars.set(varName, evaluateExpression(expr, runtimeVars));
                            j = k - 1;
                        } else {
                            if (!runtimeVars.has(varName)) {
                                if (t.value === 'string') runtimeVars.set(varName, "");
                                else runtimeVars.set(varName, "0");
                            }
                        }
                    }
                    j++;
                }
                
                if (isFunction) {
                    // Skip to brace
                    while (j < simTokens.length && simTokens[j].value !== '{') j++;
                    i = j; // Move cursor to {
                    continue; 
                }
                i = j;
                continue;
            }

            // 1b. Assignment & Standalone Increment: x = 5 + 2; i++;
            if (t.type === 'IDENTIFIER') {
                const next = simTokens[i+1];
                if (next?.value === '=') {
                    // Java Scanner Check: var = sc.nextInt()
                    if (simTokens[i+2]?.type === 'IDENTIFIER' && simTokens[i+3]?.value === '.' && (simTokens[i+4]?.value === 'nextInt' || simTokens[i+4]?.value === 'next')) {
                        const varToSet = t.value;
                        if (inputIdx < inputValues.length) {
                             const val = inputValues[inputIdx++];
                             runtimeVars.set(varToSet, val);
                             outputs.push(` <span style="color: #10b981; font-weight: 700; text-shadow: 0 0 8px rgba(16, 185, 129, 0.4);">${val}</span>\n`); 
                             currentOutputLength += val.length + 2;
                        } else {
                             iterationCount = MAX_ITERATIONS + 1;
                             return;
                        }
                        let k = i + 5;
                        while(k < simTokens.length && simTokens[k].value !== ';' && simTokens[k].value !== ',') k++;
                        i = k;
                        continue;
                    }

                    let j = i + 2;
                    let expr = [];
                    while(j < simTokens.length && simTokens[j].value !== ';' && simTokens[j].value !== ',') {
                        expr.push(simTokens[j]);
                        j++;
                    }
                    const val = evaluateExpression(expr, runtimeVars);
                    runtimeVars.set(t.value, val);
                    i = j; 
                    continue;
                }
                if (next?.value === '++' || next?.value === '--') {
                    let val = Number(runtimeVars.get(t.value)) || 0;
                    if (next.value === '++') val++; else val--;
                    runtimeVars.set(t.value, val.toString());
                    i++;
                    continue;
                }
            }

            // 2. Control Flow: IF
            if (t.value === 'if') {
                let j = i + 1;
                while(j < simTokens.length && simTokens[j].value !== '(') j++;
                let endParen = findClosing(simTokens, j, '(', ')');
                let condExpr = simTokens.slice(j + 1, endParen);
                const isTrue = evaluateCondition(condExpr, runtimeVars);
                
                j = endParen + 1;
                while(j < simTokens.length && (simTokens[j].type === 'WHITESPACE' || simTokens[j].type === 'COMMENT')) j++;
                
                let blockEnd = j;
                let blockTokens = [];
                if (simTokens[j]?.value === '{') {
                    blockEnd = findClosing(simTokens, j, '{', '}');
                    blockTokens = simTokens.slice(j + 1, blockEnd);
                } else {
                    let k = j;
                    while(k < simTokens.length && simTokens[k].value !== ';') k++;
                    blockEnd = k;
                    blockTokens = simTokens.slice(j, k + 1);
                }

                if (isTrue) {
                    execSimulation(blockTokens);
                    t._lastIfResult = true;
                } else {
                    t._lastIfResult = false;
                }
                i = blockEnd;
                continue;
            }

            // 3. Control Flow: ELSE
            if (t.value === 'else') {
                // Find previous if's result
                let prevIdx = i - 1;
                while(prevIdx >= 0 && simTokens[prevIdx].value !== 'if') prevIdx--;
                const lastIfRes = prevIdx >= 0 ? simTokens[prevIdx]._lastIfResult : true;

                let j = i + 1;
                let blockEnd = j;
                let blockTokens = [];
                if (simTokens[j]?.value === '{') {
                    blockEnd = findClosing(simTokens, j, '{', '}');
                    blockTokens = simTokens.slice(j + 1, blockEnd);
                } else {
                    let k = j;
                    while(k < simTokens.length && simTokens[k].value !== ';') k++;
                    blockEnd = k;
                    blockTokens = simTokens.slice(j, k + 1);
                }

                if (lastIfRes === false) {
                    execSimulation(blockTokens);
                }
                i = blockEnd;
                continue;
            }

            // 4. Control Flow: FOR Loop
            if (t.value === 'for') {
                let j = i + 2; // skip '('
                let initExpr = []; while(simTokens[j]?.value !== ';') initExpr.push(simTokens[j++]);
                j++; // skip ';'
                let condExpr = []; while(simTokens[j]?.value !== ';') condExpr.push(simTokens[j++]);
                j++; // skip ';'
                let incExpr = []; while(simTokens[j]?.value !== ')') incExpr.push(simTokens[j++]);
                j++; // skip ')'
                
                let blockEnd = j;
                let blockTokens = [];
                if (simTokens[j]?.value === '{') {
                    blockEnd = findClosing(simTokens, j, '{', '}');
                    blockTokens = simTokens.slice(j + 1, blockEnd);
                } else {
                    let k = j;
                    while(k < simTokens.length && simTokens[k].value !== ';') k++;
                    blockEnd = k;
                    blockTokens = simTokens.slice(j, k + 1);
                }

                // EXECUTE FOR
                execSimulation(initExpr);
                while (evaluateCondition(condExpr, runtimeVars)) {
                    if (iterationCount > MAX_ITERATIONS) break;
                    const res = execSimulation(blockTokens);
                    if (res === 'BREAK') break;
                    if (res === 'RETURN') return 'RETURN';
                    execSimulation(incExpr);
                }
                i = blockEnd;
                continue;
            }

            // 4b. Control Flow: WHILE Loop
            if (t.value === 'while') {
                let j = i + 1;
                while(j < simTokens.length && simTokens[j].value !== '(') j++;
                let endParen = findClosing(simTokens, j, '(', ')');
                let condExpr = simTokens.slice(j + 1, endParen);
                
                j = endParen + 1;
                while(j < simTokens.length && (simTokens[j].type === 'WHITESPACE' || simTokens[j].type === 'COMMENT')) j++;
                
                let blockEnd = j;
                let blockTokens = [];
                if (simTokens[j]?.value === '{') {
                    blockEnd = findClosing(simTokens, j, '{', '}');
                    blockTokens = simTokens.slice(j + 1, blockEnd);
                } else {
                    let k = j;
                    while(k < simTokens.length && simTokens[k].value !== ';') k++;
                    blockEnd = k;
                    blockTokens = simTokens.slice(j, k + 1);
                }

                while (evaluateCondition(condExpr, runtimeVars)) {
                    if (iterationCount > MAX_ITERATIONS) break;
                    const res = execSimulation(blockTokens);
                    if (res === 'BREAK') break;
                    if (res === 'RETURN') return 'RETURN';
                }
                i = blockEnd;
                continue;
            }

            // 4c. Control Flow: DO-WHILE Loop
            if (t.value === 'do') {
                let j = i + 1;
                let blockEnd = j;
                let blockTokens = [];
                if (simTokens[j]?.value === '{') {
                    blockEnd = findClosing(simTokens, j, '{', '}');
                    blockTokens = simTokens.slice(j + 1, blockEnd);
                }
                
                let k = blockEnd + 1;
                while(k < simTokens.length && simTokens[k].value !== 'while') k++;
                let condStart = k + 1;
                while(k < simTokens.length && simTokens[k].value !== '(') k++;
                k++; // skip '('
                let condExpr = [];
                let depth = 1;
                while(depth > 0 && k < simTokens.length) {
                    if (simTokens[k].value === '(') depth++;
                    if (simTokens[k].value === ')') depth--;
                    if (depth > 0) condExpr.push(simTokens[k++]);
                }
                
                do {
                    if (iterationCount > MAX_ITERATIONS) break;
                    const res = execSimulation(blockTokens);
                    if (res === 'BREAK') break;
                    if (res === 'RETURN') return 'RETURN';
                } while (evaluateCondition(condExpr, runtimeVars));
                
                i = k + 1; // skip ';'
                continue;
            }

            // 4d. Break & Continue
            if (t.value === 'break') return 'BREAK';
            if (t.value === 'continue') return 'CONTINUE';
            if (t.value === 'return') return 'RETURN';

            // 5. Input: CIN / python input() / scanf / Java Scanner
            if (t.value === 'cin' || t.value === 'input' || t.value === 'scanf' || (t.type === 'IDENTIFIER' && simTokens[i+1]?.value === '.' && (simTokens[i+2]?.value === 'nextInt' || simTokens[i+2]?.value === 'next'))) {
                let next = i + 1;
                let stopToken = ';';
                let varToSet = null;

                // Java: a = sc.nextInt();
                if (t.type === 'IDENTIFIER' && simTokens[i-1]?.value === '=') {
                    varToSet = simTokens[i-2]?.value;
                    next = i + 3; // skip .nextInt()
                }
                
                if (t.value === 'input' || t.value === 'scanf') {
                    let parenStart = i;
                    while (parenStart < simTokens.length && simTokens[parenStart].value !== '(') parenStart++;
                    
                    if (t.value === 'input' && simTokens[parenStart + 1]?.type === 'STRING') {
                        const promptText = simTokens[parenStart + 1].value.replace(/"/g, '');
                        outputs.push(promptText);
                        currentOutputLength += promptText.length;
                    }
                    
                    while (next < simTokens.length && simTokens[next].value !== '(') next++;
                    next++; // skip '('
                    stopToken = ')';
                }

                if (varToSet) {
                    if (inputIdx < inputValues.length) {
                        const val = inputValues[inputIdx++];
                        runtimeVars.set(varToSet, val);
                        outputs.push(` <span style="color: #10b981; font-weight: 700; text-shadow: 0 0 8px rgba(16, 185, 129, 0.4);">${val}</span>\n`); 
                        currentOutputLength += val.length + 2;
                    } else {
                        iterationCount = MAX_ITERATIONS + 1;
                        return;
                    }
                    i = next;
                    continue;
                }

                while (next < simTokens.length && simTokens[next].value !== stopToken) {
                    if (simTokens[next].type === 'IDENTIFIER' && !['>>', '(', ')', '&', ','].includes(simTokens[next].value)) {
                        // Handle array input: cin >> a[i]
                        let varName = simTokens[next].value;
                        if (simTokens[next + 1]?.value === '[') {
                            let end = findClosing(simTokens, next + 1, '[', ']');
                            let idx = evaluateExpression(simTokens.slice(next + 2, end), runtimeVars);
                            varName = `${varName}[${idx}]`;
                            next = end;
                        }

                        if (inputIdx < inputValues.length) {
                             const val = inputValues[inputIdx++];
                             const varDeclarationType = symbolTable.get(varName.split('[')[0]);
                             
                             // C++ Char behavior: If char, take ASCII value if it's a character
                             if (varDeclarationType === 'char' && language === 'cpp' && isNaN(val)) {
                                 runtimeVars.set(varName, val.charCodeAt(0).toString());
                             } else {
                                 runtimeVars.set(varName, val);
                             }

                             outputs.push(` <span style="color: #10b981; font-weight: 700; text-shadow: 0 0 8px rgba(16, 185, 129, 0.4);">${val}</span>\n`); 
                             currentOutputLength += val.length + 2;
                        } else {
                            iterationCount = MAX_ITERATIONS + 1;
                            return;
                        }
                    }
                    next++;
                }
                i = next;
                continue;
            }

            // 5b. Control Flow: Switch
            if (t.value === 'switch') {
                let j = i + 1;
                while(simTokens[j]?.value !== '(') j++;
                let endParen = findClosing(simTokens, j, '(', ')');
                const switchVal = evaluateExpression(simTokens.slice(j + 1, endParen), runtimeVars);
                
                j = endParen + 1;
                while(simTokens[j]?.value !== '{') j++;
                let endBrace = findClosing(simTokens, j, '{', '}');
                let block = simTokens.slice(j + 1, endBrace);
                
                let k = 0;
                let foundMatch = false;
                let defaultStart = -1;
                
                while(k < block.length) {
                    if (block[k].value === 'case') {
                        let caseVal = block[k+1].value.replace(/'|"/g, '');
                        if (caseVal === switchVal) {
                            foundMatch = true;
                            k += 3; // skip case, val, :
                            break;
                        }
                    } else if (block[k].value === 'default') {
                        defaultStart = k + 2; // skip default, :
                    }
                    k++;
                }
                
                if (foundMatch) {
                    execSimulation(block.slice(k));
                } else if (defaultStart !== -1) {
                    execSimulation(block.slice(defaultStart));
                }
                
                i = endBrace;
                continue;
            }

            // 6. Output: COUT / PRINT / System.out.println / PRINTF
            if (t.value === 'cout' || t.value === 'print' || t.value === 'System.out.println' || t.value === 'printf') {
                if (currentOutputLength > MAX_OUTPUT_CHARS) {
                    if (!outputs.includes("\n... [Output truncated due to excessive repetition]")) {
                        outputs.push("\n... [Output truncated due to excessive repetition]");
                    }
                    return;
                }
                
                let nextIdx = i + 1;
                let args = [];
                let stopToken = ';';
                
                if (t.value === 'print' || t.value === 'printf' || t.value === 'System.out.println') {
                   while (nextIdx < simTokens.length && simTokens[nextIdx].value !== '(') nextIdx++;
                   nextIdx++; 
                   stopToken = ')';
                }

                let currentExpr = [];
                while (nextIdx < simTokens.length && simTokens[nextIdx].value !== stopToken) {
                    const current = simTokens[nextIdx];
                    if (current.value === '<<' || current.value === ',') {
                        if (currentExpr.length > 0) args.push(evaluateExpression(currentExpr, runtimeVars));
                        currentExpr = [];
                        if (current.value === ',' && t.value === 'print') args.push(' ');
                    } else if (current.value === 'endl') {
                        args.push('\n');
                    } else {
                        currentExpr.push(current);
                    }
                    nextIdx++;
                }
                if (currentExpr.length > 0) args.push(evaluateExpression(currentExpr, runtimeVars));

                if (t.value === 'printf' && args.length > 0) {
                    let fmt = args[0];
                    let argIdx = 1;
                    // Simple C-style formatting
                    let formatted = fmt.replace(/%[dfs]/g, (match) => {
                        return args[argIdx++] || match;
                    });
                    outputs.push(formatted);
                    currentOutputLength += formatted.length;
                } else {
                    args.forEach(a => {
                        outputs.push(a);
                        currentOutputLength += String(a).length;
                    });
                }
                
                if (t.value === 'System.out.println' || t.value === 'print') {
                    outputs.push('\n');
                    currentOutputLength += 1;
                }

                i = nextIdx;
                continue;
            }
        }
    }

    function findClosing(tokens, start, open, close) {
        let depth = 0;
        for (let i = start; i < tokens.length; i++) {
            if (tokens[i].value === open) depth++;
            if (tokens[i].value === close) {
                depth--;
                if (depth === 0) return i;
            }
        }
        return tokens.length - 1;
    }

    function evaluateCondition(condTokens, vars) {
        if (condTokens.length === 0) return true;

        // 1. Group tokens by logical OR (||)
        let orGroups = [[]];
        condTokens.forEach(t => {
            if (t.value === '||') orGroups.push([]);
            else orGroups[orGroups.length - 1].push(t);
        });

        // 2. If ANY OR group is true, the whole condition is true
        for (const orGroup of orGroups) {
            if (orGroup.length === 0) continue;

            // 3. Group by AND (&&)
            let andGroups = [[]];
            orGroup.forEach(t => {
                if (t.value === '&&') andGroups.push([]);
                else andGroups[andGroups.length - 1].push(t);
            });

            let andResult = true;
            for (const sub of andGroups) {
                if (sub.length === 0) continue;

                // Handle NOT (!)
                let isNot = false;
                let finalSub = sub;
                if (sub[0].value === '!') {
                    isNot = true;
                    finalSub = sub.slice(1);
                }

                const operators = ['==', '!=', '>=', '<=', '>', '<', '≤', '≥'];
                let opIdx = -1;
                let op = '';

                for (let i = 0; i < finalSub.length; i++) {
                    if (operators.includes(finalSub[i].value)) {
                        opIdx = i;
                        op = finalSub[i].value;
                        if (op === '≤') op = '<=';
                        if (op === '≥') op = '>=';
                        break;
                    }
                }

                let subRes = true;
                if (opIdx !== -1) {
                    const leftExpr = finalSub.slice(0, opIdx);
                    const rightExpr = finalSub.slice(opIdx + 1);
                    const leftVal = Number(evaluateExpression(leftExpr, vars));
                    const rightVal = Number(evaluateExpression(rightExpr, vars));

                    if (op === '>') subRes = (leftVal > rightVal);
                    else if (op === '<') subRes = (leftVal < rightVal);
                    else if (op === '>=') subRes = (leftVal >= rightVal);
                    else if (op === '<=') subRes = (leftVal <= rightVal);
                    else if (op === '==') subRes = (leftVal == rightVal);
                    else if (op === '!=') subRes = (leftVal != rightVal);
                } else {
                    const val = evaluateExpression(finalSub, vars);
                    subRes = !(!val || val === '0' || val === 'false');
                }

                if (isNot) subRes = !subRes;
                if (!subRes) {
                    andResult = false;
                    break;
                }
            }

            if (andResult) return true;
        }

        return false;
    }

    execSimulation(tokens);

    const finalOutput = outputs.join('');
    return {
        errors: [...new Set(errors.map(e => JSON.stringify(e)))].map(e => JSON.parse(e)),
        simulatedOutput: finalOutput || "Program executed. (No output generated)",
        variables: Object.fromEntries(runtimeVars)
    };
};

/**
 * Helper to evaluate simple expressions like a + b or "Text"
 */
/**
 * RECURSIVE DESCENT PARSER for Universal Expression Evaluation
 * Supports Precedence: ( ) > ! Unary- > * / % > + -
 */
function evaluateExpression(exprTokens, vars) {
    if (exprTokens.length === 0) return "0";
    let pos = 0;

    function peek() { return exprTokens[pos]; }
    function consume() { return exprTokens[pos++]; }

    function primary() {
        let t = consume();
        if (!t) return "0";
        if (t.value === '(') {
            let res = expr();
            consume(); // skip ')'
            return res;
        }
        if (t.value === '!') {
            let res = primary();
            return (!(!res || res === '0' || res === 'false')) ? "0" : "1";
        }
        if (t.value === '-' && peek()?.type === 'NUMBER') {
            return String(-Number(primary()));
        }
        if (t.value === 'new') {
            // Java Object Instantiation
            while(peek() && peek().value !== ';' && peek().value !== ',' && peek().value !== ')' && peek().value !== '+' && peek().value !== '-') {
                consume();
            }
            return "[Object]";
        }
        if (t.type === 'STRING') return t.value.replace(/"/g, '').replace(/\\n/g, "\n").replace(/\\t/g, "\t");
        if (t.type === 'NUMBER') return t.value;
        if (t.type === 'IDENTIFIER') {
            let name = t.value;
            // Handle member access sc.nextInt or System.out
            while (peek()?.value === '.') {
                consume(); // .
                let member = consume()?.value;
                if (member) name += "." + member;
            }
            if (peek()?.value === '[') {
                consume(); // '['
                let res = expr();
                consume(); // ']'
                name = `${name}[${res}]`;
            }
            return vars.has(name) ? vars.get(name) : (vars.has(t.value) ? vars.get(t.value) : "0");
        }
        return t.value;
    }

    function factor() {
        let left = primary();
        while (peek() && ['*', '/', '%'].includes(peek().value)) {
            let op = consume().value;
            let right = primary();
            if (op === '*') left = String(Number(left) * Number(right));
            if (op === '/') left = String(Number(right) !== 0 ? Math.floor(Number(left) / Number(right)) : 0);
            if (op === '%') left = String(Number(right) !== 0 ? Number(left) % Number(right) : 0);
        }
        return left;
    }

    function expr() {
        let left = factor();
        while (peek() && ['+', '-'].includes(peek().value)) {
            let op = consume().value;
            let right = factor();
            if (op === '+') {
                if (isNaN(left) || isNaN(right)) left = left + right; // String concat
                else left = String(Number(left) + Number(right));
            }
            if (op === '-') left = String(Number(left) - Number(right));
        }
        return left;
    }

    try {
        return expr();
    } catch (e) {
        return exprTokens.map(t => t.value).join('');
    }
}
