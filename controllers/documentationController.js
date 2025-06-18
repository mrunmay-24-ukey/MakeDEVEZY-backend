const Documentation = require('../models/Documentation');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const dotenv = require('dotenv')
dotenv.config();



const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const detectTechStack = (files) => {
  const fileExtensions = new Set();
  const configFiles = new Set();
  const techStack = {
    languages: new Set(),
    frameworks: new Set(),
    packageManager: null
  };

  const processFile = (file) => {
    if (file.type === 'file') {
      const ext = file.name.split('.').pop().toLowerCase();
      fileExtensions.add(ext);
      configFiles.add(file.name.toLowerCase());
    }
    if (file.children) {
      file.children.forEach(processFile);
    }
  };

  files.forEach(processFile);

  // Detect languages
  const extensionToLanguage = {
    'js': 'JavaScript',
    'jsx': 'JavaScript (React)',
    'ts': 'TypeScript',
    'tsx': 'TypeScript (React)',
    'vue': 'Vue.js',
    'cpp': 'C++',
    'c': 'C',
    'java': 'Java',
    'py': 'Python',
    'rb': 'Ruby',
    'php': 'PHP',
    'sol': 'Solidity',
    'go': 'Go',
    'rs': 'Rust',
  };

  // Detect frameworks
  const frameworkIdentifiers = {
    'package.json': (content) => {
      const pkg = JSON.parse(content);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      if (deps.react) techStack.frameworks.add('React.js');
      if (deps.angular) techStack.frameworks.add('Angular');
      if (deps.vue) techStack.frameworks.add('Vue.js');
      if (deps.next) techStack.frameworks.add('Next.js');
      if (deps.svelte) techStack.frameworks.add('Svelte');
      return deps;
    },
    'pom.xml': () => techStack.frameworks.add('Spring Boot'),
    'angular.json': () => techStack.frameworks.add('Angular'),
    'next.config.js': () => techStack.frameworks.add('Next.js'),
    'svelte.config.js': () => techStack.frameworks.add('Svelte'),
  };

  fileExtensions.forEach(ext => {
    if (extensionToLanguage[ext]) {
      techStack.languages.add(extensionToLanguage[ext]);
    }
  });

  return techStack;
};

const getSpecificPrompts = (techStack) => {
  const prompts = {
    'JavaScript (React)': `
      For React components, analyze:
      - Component type (functional/class)
      - Props and their usage
      - State management (useState, useEffect, etc.)
      - Component lifecycle
      - Context usage
      - Custom hooks
      - Event handlers
      - Render logic
    `,
    'Vue.js': `
      For Vue components, analyze:
      - Component structure
      - Props and events
      - Data properties
      - Computed properties
      - Methods
      - Lifecycle hooks
      - Watchers
      - Template syntax
    `,
    'C++': `
      For C++ code, analyze:
      - Class hierarchies
      - Memory management
      - STL usage
      - Algorithms
      - Performance considerations
      - Header organization
      - Template usage
    `,
  };

  return Array.from(techStack.languages)
    .map(lang => prompts[lang] || '')
    .join('\n');
};

const documentationController = {
  // Fetch repository contents
  async fetchRepository(req, res) {
    try {
      const { repoUrl } = req.body;
      
      const urlParts = repoUrl
        .replace('https://github.com/', '')
        .replace('http://github.com/', '')
        .split('/');
      
      const owner = urlParts[0];
      const repo = urlParts[1];

      if (!owner || !repo) {
        return res.status(400).json({ 
          message: 'Invalid repository URL. Format should be: https://github.com/owner/repo' 
        });
      }

      async function fetchContents(path = '') {
        try {
          const response = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            {
              headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${process.env.GITHUB_TOKEN}`
              }
            }
          );
          return response.data;
        } catch (error) {
          console.error('GitHub API Request Failed:', {
            url: `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            status: error.response?.status,
            message: error.response?.data?.message || error.message
          });
          throw error;
        }
      }

      const files = await fetchContents();
      res.json(files);
    } catch (error) {
      console.error('GitHub API Error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
      
      res.status(error.response?.status || 500).json({ 
        message: error.response?.data?.message || 'Failed to fetch repository contents',
        details: error.response?.data
      });
    }
  },

  // Generate documentation
  async generateDocumentation(req, res) {
    try {
      const { files, repoUrl } = req.body;
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const techStack = detectTechStack(files);
      const specificPrompts = getSpecificPrompts(techStack);

      const prompt = `As an expert developer, analyze the following codebase and generate detailed documentation.
      
      Technical Stack Detected:
      Languages: ${Array.from(techStack.languages).join(', ')}
      Frameworks: ${Array.from(techStack.frameworks).join(', ')}
      
      Codebase: ${JSON.stringify(files)}

      ${specificPrompts}

      Please provide a comprehensive analysis following this structure:

      1. Project Overview
         - Main purpose and functionality
         - Key features
         - Technologies used

      2. Technical Stack Analysis
         - Languages and versions
         - Frameworks and libraries
         - Architecture patterns used

      3. Detailed Code Analysis
         For each file:
         - Purpose and responsibility
         - Language/framework-specific features used
         - Key functions/components and their roles
         - Important variables and their usage
         - Logic flow explanation
         - Any notable algorithms or patterns

      4. Dependencies and Integration
         - External libraries used
         - How different parts interact
         - API integrations (if any)

      5. Setup and Configuration
         - Installation steps
         - Required environment variables
         - Configuration options

      6. Best Practices and Patterns
         - Language-specific best practices followed
         - Framework-specific patterns used
         - Error handling approach
         - Performance considerations

      7. Potential Improvements
         - Code optimization suggestions
         - Scalability considerations
         - Security recommendations

      Please format the documentation in Markdown and ensure it's developer-friendly with code examples where relevant.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const documentation = response.text();

      // Save to database
      const newDoc = new Documentation({
        repositoryUrl: repoUrl,
        generatedDocs: documentation,
        techStack: {
          languages: Array.from(techStack.languages),
          frameworks: Array.from(techStack.frameworks)
        }
      });
      await newDoc.save();

      res.json({ documentation, techStack });
    } catch (error) {
      console.error('Error generating documentation:', error);
      res.status(500).json({ message: error.message });
    }
  },

  // Fetch file content
  async fetchFileContent(req, res) {
    try {
      const { owner, repo, path } = req.body;

      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${process.env.GITHUB_TOKEN}`
          }
        }
      );

      // GitHub API returns base64 encoded content
      const content = Buffer.from(response.data.content, 'base64').toString();
      res.json({ content });
    } catch (error) {
      console.error('GitHub API Error:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
      res.status(error.response?.status || 500).json({ 
        message: error.response?.data?.message || 'Failed to fetch file content',
        details: error.response?.data
      });
    }
  }
};

module.exports = documentationController;