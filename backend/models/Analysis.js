const mongoose = require('mongoose');

const AnalysisSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true
    },
    userInput: {
        type: String,
        default: ""
    },
    tokens: [
        {
            type: { type: String },
            value: String
        }
    ],
    errors: [
        {
            message: String,
            line: Number,
            column: Number
        }
    ],
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Analysis', AnalysisSchema);
