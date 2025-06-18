const express = require('express');
const router = express.Router();
const Snippet = require('../models/Snippet');
const protect = require('../middleware/authMiddleware');

// Create a new snippet
router.post('/', protect, async (req, res) => {
  const { title, description, code, tags } = req.body;
  console.log('Received snippet:', { title, description, code, tags }); // Log the data to verify
  try {
    const newSnippet = new Snippet({
      title,
      description,
      code,
      tags,
      user: req.user.id // Add user reference
    });
    await newSnippet.save();
    res.status(201).json(newSnippet);
  } catch (error) {
    res.status(500).json({ message: 'Error creating snippet', error });
  }
});

// Get all snippets
router.get('/', protect, async (req, res) => {
  try {
    const snippets = await Snippet.find({ user: req.user.id });
    res.status(200).json(snippets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching snippets', error });
  }
});

// Delete a snippet
router.delete('/:id', protect, async (req, res) => {
  const { id } = req.params;

  try {
    const snippet = await Snippet.findById(id);
    
    if (!snippet) {
      return res.status(404).json({ message: 'Snippet not found' });
    }

    // Check if the snippet belongs to the user
    if (snippet.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized to delete this snippet' });
    }

    await snippet.deleteOne();
    res.status(200).json({ message: 'Snippet deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting snippet', error });
  }
});

module.exports = router;
