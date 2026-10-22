var express = require('express');
var router = express.Router();
const Deck = require('../models/deck');

router.get('/', function(req, res) {
  res.render('index', { title: 'TCG Deck Builder' });
});

router.get('/homepage', (req, res) => {
    res.redirect('/home');
});

// ==========================================
// PASSO 1: Homepage - Extrai pokémons principais e procura foto na API
// ==========================================
router.get('/home', async (req, res) => {
    try {
        const decks = await Deck.find({});
        
        // Extrai pokémons únicos registados nos teus decks
        const setPokemons = new Set();
        decks.forEach(deck => {
            if (deck.pokemons_principais) {
                deck.pokemons_principais.forEach(p => setPokemons.add(p));
            }
        });

        const pokemonsMeta = [];
        for (const nomePokemon of setPokemons) {
            // Imagem padrão online (Verso da carta Pokémon)
            let imagem = 'https://tcg.pokemon.com/assets/img/global/tcg-card-back-2x.jpg'; 
            
            try {
                // encodeURIComponent formata os espaços corretamente (ex: Charizard%20ex)
                const url = `https://api.tcgdex.net/v2/pt/cards?name=${encodeURIComponent(nomePokemon)}`;
                const resposta = await fetch(url);
                const cartas = await resposta.json();
                
                // Pega na primeira versão da carta que tenha imagem disponível
                const cartaComImagem = cartas.find(c => c.image);
                if (cartaComImagem) {
                    imagem = cartaComImagem.image + '/high.png';
                }
            } catch (err) {
                console.error('Erro ao buscar imagem na API para', nomePokemon);
            }

            pokemonsMeta.push({
                id: nomePokemon.toLowerCase().replace(/\s+/g, '-'),
                nome: nomePokemon,
                imagem: imagem
            });
        }

        res.render('homepage', { 
            paginaAtual: 'home', 
            pokemons: pokemonsMeta 
        });
    } catch (erro) {
        console.error(erro);
        res.status(500).send('Erro ao carregar a página.');
    }
});

// ==========================================
// PASSO 2: Listar os decks que contêm o pokémon selecionado
// ==========================================
router.get('/pokemon/:nome_pokemon', async (req, res) => {
    try {
        const pokemonSlug = req.params.nome_pokemon;
        const decksDoBanco = await Deck.find({});
        
        const decksFiltrados = decksDoBanco.filter(deck => 
            deck.pokemons_principais.some(p => p.toLowerCase().replace(/\s+/g, '-') === pokemonSlug)
        );

        const decksFormatados = [];
        for (const deck of decksFiltrados) {
            let imagemCapa = '/images/card-back.png';
            
            if (deck.cartas && deck.cartas.length > 0) {
                try {
                    // Pega na capa procurando o ID da primeira carta do deck na API
                    const idApi = deck.cartas[0].carta_id_api;
                    const resApi = await fetch(`https://api.tcgdex.net/v2/pt/cards/${idApi}`);
                    const cartaApi = await resApi.json();
                    
                    if (cartaApi.image) {
                        imagemCapa = cartaApi.image + '/high.png';
                    }
                } catch (err) {
                    console.error('Erro ao buscar capa do deck na API');
                }
            }

            decksFormatados.push({
                id: deck._id,
                nome: deck.nome,
                autor: deck.autor || 'Anónimo',
                favoritos: 0,
                imagemCapa: imagemCapa
            });
        }

        const nomeBonito = pokemonSlug.replace(/-/g, ' ').toUpperCase();
        res.render('variantes', { 
            paginaAtual: 'home', 
            decks: decksFormatados,
            pokemonDestaque: nomeBonito
        });
    } catch (erro) {
        res.status(500).send('Erro ao carregar variações.');
    }
});

// ==========================================
// PASSO 3: Mostrar todas as cartas do deck puxando os dados da API
// ==========================================
router.get('/deck/:id_deck', async (req, res) => {
    try {
        const deckId = req.params.id_deck;
        const deckDoBanco = await Deck.findById(deckId);

        if (!deckDoBanco) {
            return res.status(404).send('Deck não encontrado.');
        }

        // Puxar detalhes de cada carta na API usando o carta_id_api
        const cartasFormatadas = [];
        for (const item of deckDoBanco.cartas) {
            let nomeCarta = 'A carregar...';
            let imagemCarta = '/images/card-back.png';

            try {
                const resApi = await fetch(`https://api.tcgdex.net/v2/pt/cards/${item.carta_id_api}`);
                const cartaApi = await resApi.json();

                if (cartaApi.name) nomeCarta = cartaApi.name;
                if (cartaApi.image) imagemCarta = cartaApi.image + '/high.png';
            } catch (err) {
                console.error(`Erro ao buscar carta ${item.carta_id_api}`);
            }

            cartasFormatadas.push({
                nome: nomeCarta,
                quantidade: item.quantidade,
                imagem: imagemCarta
            });
        }

        res.render('deck-detalhes', { 
            paginaAtual: 'home', 
            deck: { nome: deckDoBanco.nome, cartas: cartasFormatadas }
        });
    } catch (erro) {
        res.status(500).send('Erro ao detalhar deck.');
    }
});

// ==========================================
// Rota dos Seus Decks
// ==========================================
router.get('/seus-decks', async (req, res) => {
    try {
        const meusDecks = await Deck.find({}).lean();
        
        const decksComCapa = [];
        for (const deck of meusDecks) {
            let imagemCapa = '/images/card-back.png';
            if (deck.cartas && deck.cartas.length > 0) {
                try {
                    const idApi = deck.cartas[0].carta_id_api;
                    const resApi = await fetch(`https://api.tcgdex.net/v2/pt/cards/${idApi}`);
                    const cartaApi = await resApi.json();
                    if (cartaApi.image) imagemCapa = cartaApi.image + '/high.png';
                } catch (e) {}
            }
            decksComCapa.push({
                id: deck._id,
                nome: deck.nome,
                imagemCapa: imagemCapa
            });
        }

        res.render('seus-decks', { 
            paginaAtual: 'seus-decks',
            decks: decksComCapa 
        });
    } catch (erro) {
        res.status(500).send('Erro ao carregar os teus decks.');
    }
});

module.exports = router;