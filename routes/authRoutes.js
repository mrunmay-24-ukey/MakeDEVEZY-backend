const express = require('express');
const router = express.Router();
const { signup, login, getMe, forgotPassword, verifyOTP, resetPassword } = require('../controllers/authController');
const protect = require('../middleware/authMiddleware');

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', protect, getMe);

module.exports = router; 