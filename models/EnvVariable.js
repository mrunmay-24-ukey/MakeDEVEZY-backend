const mongoose = require('mongoose');

const envVariableSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        value: { type: String, required: true },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('EnvVariable', envVariableSchema);