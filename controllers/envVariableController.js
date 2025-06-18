const EnvVariable = require('../models/EnvVariable');

// Get all environment variables for the logged-in user
exports.getAllEnvVariables = async (req, res) => {
  try {
    const envVariables = await EnvVariable.find({ user: req.user.id });
    res.status(200).json(envVariables);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving environment variables' });
  }
};

// Create a new environment variable for the logged-in user
exports.createEnvVariable = async (req, res) => {
  const { name, value } = req.body;

  if (!name || !value) {
    return res.status(400).json({ message: 'Name and value are required' });
  }

  try {
    const newEnvVariable = new EnvVariable({ name, value, user: req.user.id });
    await newEnvVariable.save();
    res.status(201).json(newEnvVariable);
  } catch (err) {
    res.status(500).json({ message: 'Error saving environment variable' });
  }
};

// Update an existing environment variable for the logged-in user
exports.updateEnvVariable = async (req, res) => {
  const { value } = req.body; // Only need the new value

  if (!value) {
    return res.status(400).json({ message: 'Value is required' });
  }

  try {
    const envVariable = await EnvVariable.findOne({ _id: req.params.id, user: req.user.id });
    if (!envVariable) {
      return res.status(404).json({ message: 'Environment variable not found' });
    }
    envVariable.value = value;
    await envVariable.save();
    res.status(200).json(envVariable);
  } catch (err) {
    res.status(500).json({ message: 'Error updating environment variable' });
  }
};

// Delete an environment variable for the logged-in user
exports.deleteEnvVariable = async (req, res) => {
  try {
    const deletedEnvVariable = await EnvVariable.findOneAndDelete({ name: req.params.name, user: req.user.id });
    if (!deletedEnvVariable) {
      return res.status(404).json({ message: 'Environment variable not found' });
    }
    res.status(200).json({ message: 'Environment variable deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting environment variable' });
  }
};