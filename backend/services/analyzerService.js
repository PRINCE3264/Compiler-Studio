const lexer = require('../compilerCore/lexer');
const parser = require('../compilerCore/parser');
const semantic = require('../compilerCore/semantic');

exports.analyze = (code, userInput, language) => {
    // Basic analysis pipeline
    try {
        const tokens = lexer.tokenize(code);
        const ast = parser.parse(tokens);
        const analysis = semantic.check(ast, code, userInput, language);

        return {
            tokens,
            ast,
            analysis,
            userInput,
            success: true
        };
    } catch (error) {
        return {
            error: error.message,
            success: false
        };
    }
};
