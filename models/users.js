const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    idade: { type: Number, required: true },
    senha: { type: String, required: true },
    dataCriacao: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);