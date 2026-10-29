var express = require('express');
var router = express.Router();
const Deck = require('../models/deck');

router.get('/', function(req, res) { res.render('index', { title: 'TCG Deck Builder' }); });
router.get('/homepage', (req, res) => res.redirect('/home'));

// ==========================================
// FUNÇÃO DE BUSCA POR NOME (Simples e Direta)
// ==========================================
async function buscarCartaPorNome(nomeCarta) {
    if (!nomeCarta) return null;
    try {
        const url = `https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(nomeCarta)}`;
        const res = await fetch(url);
        
        if (res.ok) {
            const cartas = await res.json();
            if (Array.isArray(cartas) && cartas.length > 0) {
                let cartaComImagem = null;
                
                // Filtros inteligentes para cartas que têm versões "ex" ou evoluções com nomes parecidos
                const nomeLower = nomeCarta.toLowerCase();
                if (nomeLower === 'munkidori') {
                    // Procura a versão normal (ignora "ex")
                    cartaComImagem = cartas.find(c => c.image && !c.name.toLowerCase().includes('ex'));
                } else if (nomeLower === 'dunsparce') {
                    // Procura o Dunsparce (ignora Dudunsparce)
                    cartaComImagem = cartas.find(c => c.image && c.name.toLowerCase() === 'dunsparce');
                } else {
                    cartaComImagem = cartas.find(c => c.image);
                }
                
                if (cartaComImagem) return cartaComImagem;
            }
        }
    } catch (e) {
        console.error("Erro ao buscar carta:", nomeCarta);
    }
    return null;
}

// ==========================================
// PASSO 1: Homepage
// ==========================================
router.get('/home', async (req, res) => {
    try {
        const decks = await Deck.find({});
        const setPokemons = new Set();
        decks.forEach(deck => {
            if (deck.pokemons_principais) deck.pokemons_principais.forEach(p => setPokemons.add(p));
        });

        const pokemonsMeta = [];
        for (const nomePokemon of setPokemons) {
            let imagem = 'https://tcg.pokemon.com/assets/img/global/tcg-card-back-2x.jpg'; 
            
            const cartaApi = await buscarCartaPorNome(nomePokemon);
            if (cartaApi && cartaApi.image) imagem = cartaApi.image + '/high.png';

            pokemonsMeta.push({
                id: nomePokemon.toLowerCase().replace(/\s+/g, '-'),
                nome: nomePokemon,
                imagem: imagem
            });
        }
        res.render('homepage', { paginaAtual: 'home', pokemons: pokemonsMeta });
    } catch (erro) { 
        res.status(500).send('Erro ao carregar a página.'); 
    }
});

// ==========================================
// PASSO 2: Listar Decks do Pokémon
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
            let imagemCapa = 'https://tcg.pokemon.com/assets/img/global/tcg-card-back-2x.jpg';
            if (deck.cartas && deck.cartas.length > 0) {
                const cartaApi = await buscarCartaPorNome(deck.cartas[0].carta_id_api);
                if (cartaApi && cartaApi.image) imagemCapa = cartaApi.image + '/high.png';
            }
            decksFormatados.push({
                id: deck._id, nome: deck.nome, autor: deck.autor || 'Anônimo', favoritos: 0, imagemCapa: imagemCapa
            });
        }
        const nomeBonito = pokemonSlug.replace(/-/g, ' ').toUpperCase();
        res.render('variantes', { paginaAtual: 'home', decks: decksFormatados, pokemonDestaque: nomeBonito });
    } catch (erro) { res.status(500).send('Erro ao carregar variações.'); }
});

// ==========================================
// PASSO 3: Detalhes do Deck
// ==========================================
router.get('/deck/:id_deck', async (req, res) => {
    try {
        const deckId = req.params.id_deck;
        const deckDoBanco = await Deck.findById(deckId);
        if (!deckDoBanco) return res.status(404).send('Deck não encontrado.');

        const cartasFormatadas = [];
        for (const item of deckDoBanco.cartas) {
            let nomeCarta = item.carta_id_api;
            let imagemCarta = 'https://tcg.pokemon.com/assets/img/global/tcg-card-back-2x.jpg';

            const cartaApi = await buscarCartaPorNome(item.carta_id_api);
            if (cartaApi) {
                if (cartaApi.name) nomeCarta = cartaApi.name;
                if (cartaApi.image) imagemCarta = cartaApi.image + '/high.png';
            }
            cartasFormatadas.push({ nome: nomeCarta, quantidade: item.quantidade, imagem: imagemCarta });
        }
        res.render('deck-detalhes', { paginaAtual: 'home', deck: { nome: deckDoBanco.nome, cartas: cartasFormatadas } });
    } catch (erro) { res.status(500).send('Erro ao detalhar deck.'); }
});

// ==========================================
// Seus Decks
// ==========================================
router.get('/seus-decks', async (req, res) => {
    try {
        const meusDecks = await Deck.find({}).lean();
        const decksComCapa = [];
        for (const deck of meusDecks) {
            let imagemCapa = 'https://tcg.pokemon.com/assets/img/global/tcg-card-back-2x.jpg';
            if (deck.cartas && deck.cartas.length > 0) {
                const cartaApi = await buscarCartaPorNome(deck.cartas[0].carta_id_api);
                if (cartaApi && cartaApi.image) imagemCapa = cartaApi.image + '/high.png';
            }
            decksComCapa.push({ id: deck._id, nome: deck.nome, imagemCapa: imagemCapa });
        }
        res.render('seus-decks', { paginaAtual: 'seus-decks', decks: decksComCapa });
    } catch (erro) { res.status(500).send('Erro ao carregar os teus decks.'); }
});

module.exports = router;