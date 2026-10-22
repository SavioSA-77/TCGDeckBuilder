const mongoose = require('mongoose');

const deckSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  autor: { type: String, default: 'Anônimo' }, // Adicionado para combinar com a sua view
  pokemons_principais: { type: [String], default: [] }, 
  
  cartas: [
    {
      // A GRANDE MUDANÇA: Agora salvamos apenas o ID em texto que vem da API
      carta_id_api: { 
        type: String, 
        required: true 
      },
      quantidade: { 
        type: Number, 
        required: true, 
        min: 1, 
        max: 4 
      }
    }
  ]
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Deck', deckSchema);  