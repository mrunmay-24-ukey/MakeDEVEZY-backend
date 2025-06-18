const express = require('express');
const router = express.Router();
const diagramController = require('../controllers/diagramController');
const protect = require('../middleware/authMiddleware');

// Generate diagram from documentation
router.post('/generate', protect, diagramController.generateDiagram);

module.exports = router; 