var express = require('express');
var router = express.Router();
const Deck = require('../models/deck'); // Importando o seu model para uso futuro

router.get('/', function(req, res) {
  res.render('index', { title: 'TCG Deck Builder' });
});

router.get('/homepage', function(req, res) {
  res.render('homepage', {
    title: 'TCG Deck Builder',
    cards: Array.from({ length: 8 }, function() { return {}; })
  });
});

// Arrays temporários para não dar erro enquanto não conecta o banco de dados
const decksSimulados = []; 
const meusDecksSimulados = [
  { id: '1', nome: 'Meu Deck Psíquico', imagemCapa: '/images/olhoAberto.png' }
];

// Rota da Home (Decks da comunidade) - CORRIGIDO PARA router.get
router.get('/home', (req, res) => {
    res.render('homepage', { 
        paginaAtual: 'homepage', 
        decks: decksSimulados 
    });
});

// Rota dos Seus Decks - CORRIGIDO PARA router.get
router.get('/seus-decks', (req, res) => {
    // Certifique-se de que o arquivo na pasta views se chame EXATAMENTE "seus-decks.ejs"
    res.render('seus-decks', { 
        paginaAtual: 'seus-decks',
        decks: meusDecksSimulados 
    });
});

module.exports = router;