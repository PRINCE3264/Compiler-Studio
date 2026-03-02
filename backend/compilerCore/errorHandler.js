exports.handleError = (error, sourceCode) => {
    // Basic error reporting logic
    return {
        message: error.message,
        line: error.line || 1,
        column: error.column || 1,
        source: sourceCode
    };
};
