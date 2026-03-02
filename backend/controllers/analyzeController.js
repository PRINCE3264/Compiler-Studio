const analyzerService = require('../services/analyzerService');
const Analysis = require('../models/Analysis');

exports.postAnalysis = async (req, res) => {
    try {
        const { code, userInput } = req.body;
        const result = analyzerService.analyze(code, userInput);

        // Store in MongoDB
        const analysisSave = new Analysis({
            code: code,
            userInput: userInput || "",
            tokens: result.tokens,
            errors: result.analysis.errors
        });
        await analysisSave.save();

        res.status(200).json({ ...result, id: analysisSave._id });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const history = await Analysis.find().sort({ timestamp: -1 }).limit(10);
        res.status(200).json(history);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};
