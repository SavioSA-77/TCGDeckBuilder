const mongoose = require('mongoose');

const deckSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  
  // Campo adicionado para os destaques do deck
  pokemons_principais: { type: [String], default: [] }, 
  
  cartas: [
    {
      carta_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Carta',
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