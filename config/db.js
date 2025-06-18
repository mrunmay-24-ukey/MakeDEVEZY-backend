const mongoose = require('mongoose');

const connectDB = async () => {
    try{
        await mongoose.connect(process.env.MONGO_URI)
        console.log('MONOGO DB CONNECTED');

    }
    catch(e){
        console.error('Error:', e.message);
        process.exit(1);    
    }
}

module.exports = connectDB;