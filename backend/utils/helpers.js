exports.formatResponse = (data, message = 'Success') => ({
    timestamp: new Date().toISOString(),
    message,
    data
});
