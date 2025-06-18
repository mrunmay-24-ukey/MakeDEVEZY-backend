const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { handleGeminiError } = require('../utils/errorHandler');
const protect = require('../middleware/authMiddleware');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/generate', protect, async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ response: text });
  } catch (error) {
    const errorResponse = handleGeminiError(error);
    res.status(errorResponse.type === 'RATE_LIMIT' ? 429 : 500).json(errorResponse);
  }
});

module.exports = router;
