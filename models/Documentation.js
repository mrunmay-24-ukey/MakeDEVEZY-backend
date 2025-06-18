  const mongoose = require('mongoose');

  const DocumentationSchema = new mongoose.Schema({
    repositoryUrl: {
      type: String,
      required: true
    },
    generatedDocs: {
      type: String,
      required: true
    },
    techStack: {
      languages: [String],
      frameworks: [String]
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  });

  module.exports = mongoose.model('Documentation', DocumentationSchema);