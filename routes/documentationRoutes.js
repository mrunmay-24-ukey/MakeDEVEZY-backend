const express = require('express');
const router = express.Router();
const documentationController = require('../controllers/documentationController');
const protect = require('../middleware/authMiddleware');

// Fetch repository contents
router.post('/fetch-repo', protect, documentationController.fetchRepository);

// Generate documentation
router.post('/generate', protect, documentationController.generateDocumentation);

// Fetch file content
router.post('/fetch-file', protect, documentationController.fetchFileContent);

module.exports = router;