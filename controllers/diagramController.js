const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const diagramController = {
  generateDiagram: async (req, res) => {
    try {
      const { files, diagramType } = req.body;

      if (!files || !diagramType) {
        return res.status(400).json({
          success: false,
          message: 'Repository files and diagram type are required'
        });
      }

      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      // First, generate documentation specifically for diagram generation
      const analysisPrompt = `Analyze the following repository structure and generate documentation specifically for creating a ${diagramType} diagram:

      Repository Structure:
      ${JSON.stringify(files, null, 2)}

      Please analyze and document:
      1. Main components and their relationships
      2. Data flow between components
      3. Key functions and their interactions
      4. Important classes and their methods
      5. Entry points and exit points
      6. Control flow and decision points
      7. External dependencies and integrations

      Focus on aspects that are relevant for creating a ${diagramType} diagram.`;

      const analysisResult = await model.generateContent(analysisPrompt);
      const analysisResponse = await analysisResult.response;
      const analysis = analysisResponse.text();

      // Then, generate the Mermaid diagram code
      const diagramPrompt = `Based on the following analysis, generate a ${diagramType} diagram using Mermaid.js syntax:

      Analysis:
      ${analysis}

      Requirements:
      1. Use proper Mermaid.js syntax for ${diagramType} diagrams
      2. Include all major components and their relationships
      3. Show data flow and control flow clearly
      4. Use appropriate shapes and connectors
      5. Make the diagram well-organized and easy to understand
      6. Return ONLY the Mermaid.js code without any additional text
      7. The code should start with \`\`\`mermaid and end with \`\`\`

      For ${diagramType} diagrams:
      ${diagramType === 'flowchart' ? `
      - Use rectangles for processes
      - Use diamonds for decisions
      - Use parallelograms for input/output
      - Use arrows to show flow direction
      - Include clear labels for each element` : 
      diagramType === 'sequence' ? `
      - Use participants for different components
      - Show message flow between participants
      - Include activation bars for method calls
      - Show return messages
      - Include notes for important points` :
      diagramType === 'class' ? `
      - Show class names and properties
      - Include method signatures
      - Show inheritance relationships
      - Include associations and dependencies
      - Use proper UML notation` : ''}`;

      const diagramResult = await model.generateContent(diagramPrompt);
      const diagramResponse = await diagramResult.response;
      const mermaidCode = diagramResponse.text();

      // Clean up the response to get just the mermaid code
      const cleanMermaidCode = mermaidCode
        .replace(/^```mermaid\n/, '')
        .replace(/\n```$/, '')
        .trim();

      res.json({ 
        success: true,
        mermaidCode: cleanMermaidCode,
        analysis: analysis // Optional: include the analysis for reference
      });
    } catch (error) {
      console.error('Error generating diagram:', error);
      res.status(500).json({ 
        success: false,
        message: error.message || 'Failed to generate diagram'
      });
    }
  }
};

module.exports = diagramController;
