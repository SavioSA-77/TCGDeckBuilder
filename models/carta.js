const mongoose = require('mongoose');

const cartaSchema = new mongoose.Schema({
  foto: { type: String, required: true }, // URL da imagem
  nome: { type: String, required: true }, // Ex: "Pikachu VMAX"
  nome_pokemon: { type: String, required: true }, // Ex: "Pikachu"
  tipo: { type: String, required: true }, // Ex: "Elétrico"
  energias: { type: [String], default: [] }, // Array de strings, Ex: ["Elétrico", "Incolor"]
  decks: { type: [String], default: [] } // Onde essa carta é usada (pode ser ajustado futuramente para referenciar um modelo Deck)
}, { 
  timestamps: true // Cria automaticamente os campos createdAt e updatedAt
});

module.exports = mongoose.model('Carta', cartaSchema);