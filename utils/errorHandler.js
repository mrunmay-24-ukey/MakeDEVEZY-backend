const handleGeminiError = (error) => {
  if (error.response?.status === 429) {
    return {
      error: true,
      message: 'API rate limit exceeded. Please try again later or upgrade your plan.',
      details: 'You have exceeded the free tier quota for Gemini API. Consider upgrading your plan or waiting for the quota to reset.',
      type: 'RATE_LIMIT'
    };
  }

  if (error.response?.data?.error) {
    return {
      error: true,
      message: error.response.data.error.message || 'An error occurred with the Gemini API',
      details: error.response.data.error.details || 'Please try again later',
      type: 'API_ERROR'
    };
  }

  return {
    error: true,
    message: 'An unexpected error occurred',
    details: error.message || 'Please try again later',
    type: 'UNKNOWN_ERROR'
  };
};

module.exports = {
  handleGeminiError
}; 