const express = require('express');
const router = express.Router();
const envVariableController = require('../controllers/envVariableController');
const protect = require('../middleware/authMiddleware');

router.get('/', protect, envVariableController.getAllEnvVariables);
router.post('/', protect, envVariableController.createEnvVariable);
router.put('/:id', protect, envVariableController.updateEnvVariable);
router.delete('/:name', protect, envVariableController.deleteEnvVariable);

module.exports = router;