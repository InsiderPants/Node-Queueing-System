const mongoose = require('mongoose');
// Schema for User
const Schema = mongoose.Schema;

const userSchema = new Schema ({
    name : String,
    email : String,
    password : String  
});

const User = mongoose.model('user', userSchema);

module.exports = User;