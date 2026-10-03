const mongoose = require('mongoose');

const cartaSchema = new mongoose.Schema({
  foto: { type: String, required: true }, 
  nome: { type: String, required: true }, 
  
  // 'required: true' foi removido. Agora aceita itens e energias sem dar erro.
  nome_pokemon: { type: String }, 
  
  tipo: { type: String, required: true }, 
  energias: { type: [String], default: [] } 
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Carta', cartaSchema);