const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Analyze test code and provide suggestions
exports.analyzeTest = async (code, description, type) => {
  try {
    const prompt = `
      Analyze this ${type} test:
      
      Description: ${description}
      
      Code:
      ${code}
      
      Please provide:
      1. Potential improvements
      2. Code coverage analysis
      3. Performance optimization suggestions
      4. Best practices recommendations
      5. Potential edge cases to consider
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the response into structured data
    const analysis = parseGeminiResponse(text);

    return analysis;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to analyze test with Gemini AI');
  }
};

// Generate test cases from description
exports.generateTestCases = async (description, type) => {
  try {
    const prompt = `
      Generate ${type} test cases for the following requirement:
      
      ${description}
      
      Please provide:
      1. Test scenarios
      2. Test code
      3. Expected results
      4. Edge cases to consider
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return parseTestCases(text);
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to generate test cases');
  }
};

// Detect potential flaky tests
exports.detectFlakyTests = async (code) => {
  try {
    const prompt = `
      Analyze this test code for potential flakiness:
      
      ${code}
      
      Please identify:
      1. Race conditions
      2. Time-dependent issues
      3. External dependencies
      4. Async/await problems
      5. Suggested fixes
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return parseFlakyAnalysis(text);
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('Failed to analyze test flakiness');
  }
};

// Helper function to parse Gemini's response into structured data
function parseGeminiResponse(text) {
  // Implementation would depend on the expected response format
  // This is a simple example
  const sections = text.split('\n\n');
  
  return {
    improvements: sections[0]?.split('\n').filter(Boolean) || [],
    coverage: sections[1] || '',
    optimizations: sections[2]?.split('\n').filter(Boolean) || [],
    bestPractices: sections[3]?.split('\n').filter(Boolean) || [],
    edgeCases: sections[4]?.split('\n').filter(Boolean) || [],
  };
}

function parseTestCases(text) {
  // Implementation for parsing test cases
  const sections = text.split('\n\n');
  
  return {
    scenarios: sections[0]?.split('\n').filter(Boolean) || [],
    code: sections[1] || '',
    expectedResults: sections[2]?.split('\n').filter(Boolean) || [],
    edgeCases: sections[3]?.split('\n').filter(Boolean) || [],
  };
}

function parseFlakyAnalysis(text) {
  // Implementation for parsing flaky test analysis
  const sections = text.split('\n\n');
  
  return {
    raceConditions: sections[0]?.split('\n').filter(Boolean) || [],
    timeIssues: sections[1]?.split('\n').filter(Boolean) || [],
    dependencies: sections[2]?.split('\n').filter(Boolean) || [],
    asyncIssues: sections[3]?.split('\n').filter(Boolean) || [],
    fixes: sections[4]?.split('\n').filter(Boolean) || [],
  };
} 