const express = require('express');
const router = express.Router();
const analyzeController = require('../controllers/analyzeController');

router.post('/', analyzeController.postAnalysis);
router.get('/history', analyzeController.getHistory);

module.exports = router;
