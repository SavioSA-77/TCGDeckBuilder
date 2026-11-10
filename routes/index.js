var express = require('express');
var router = express.Router();
const Deck = require('../models/deck');
const User = require('../models/users');
const bcrypt = require('bcrypt');

router.get('/', function(req, res) { 
    res.render('index', { title: 'TCG Deck Builder', erro: null }); 
});
router.get('/homepage', (req, res) => res.redirect('/home'));

// ==========================================
// FUNÇÃO DE BUSCA CORRIGIDA (Fallback para Hífens)
// ==========================================
async function buscarCartaPorNome(termo) {
    if (!termo) return null;
    try {
        if (termo.includes('-')) {
            try {
                const resID = await fetch(`https://api.tcgdex.net/v2/en/cards/${termo.toLowerCase()}`);
                if (resID.ok) {
                    const dataID = await resID.json();
                    if (dataID && dataID.image) return dataID;
                }
            } catch (e) {}
        }

        const url = `https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(termo)}`;
        const res = await fetch(url);
        
        if (res.ok) {
            const cartas = await res.json();
            if (Array.isArray(cartas) && cartas.length > 0) {
                const termoLower = termo.toLowerCase().trim();
                
                let candidatas = cartas.filter(c => c && c.image);
                if (candidatas.length === 0) return null;

                if (termoLower === 'munkidori') {
                    candidatas = candidatas.filter(c => !c.name.toLowerCase().includes('ex'));
                } else if (termoLower === 'dunsparce') {
                    candidatas = candidatas.filter(c => c.name.toLowerCase() === 'dunsparce');
                } else {
                    const exatas = candidatas.filter(c => c.name.toLowerCase() === termoLower);
                    if (exatas.length > 0) candidatas = exatas;
                }

                if (candidatas.length === 0) return null;

                const svCard = candidatas.find(c => c.id && c.id.toLowerCase().startsWith('sv'));
                if (svCard) return svCard;

                const swshCard = candidatas.find(c => c.id && c.id.toLowerCase().startsWith('swsh'));
                if (swshCard) return swshCard;

                const smCard = candidatas.find(c => c.id && c.id.toLowerCase().startsWith('sm'));
                if (smCard) return smCard;

                return candidatas[0];
            }
        }
    } catch (e) {
        console.error("Erro ao buscar carta:", termo);
    }
    return null;
}

// ==========================================
// AUTENTICAÇÃO: CADASTRO
// ==========================================
router.get('/cadastro', (req, res) => {
    res.render('cadastro', { erro: null });
});

router.post('/cadastro', async (req, res) => {
    try {
        const { username, email, idade, senha, confirmarSenha } = req.body;

        if (senha !== confirmarSenha) {
            return res.render('cadastro', { erro: 'As senhas não coincidem.' });
        }

        const utilizadorExistente = await User.findOne({ $or: [{ email }, { username }] });
        if (utilizadorExistente) {
            return res.render('cadastro', { erro: 'Email ou Nome de Usuário já em uso.' });
        }

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        const novoUser = new User({
            username,
            email,
            idade,
            senha: senhaHash
        });

        await novoUser.save();
        res.redirect('/');
    } catch (erro) {
        res.render('cadastro', { erro: 'Erro ao criar conta. Tente novamente.' });
    }
});

// ==========================================
// AUTENTICAÇÃO: LOGIN
// ==========================================
router.get('/login', (req, res) => {
    res.redirect('/');
});

router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.render('index', { erro: 'Email ou senha incorretos.', title: 'TCG Deck Builder' });
        }

        const senhaValida = await bcrypt.compare(senha, user.senha);
        if (!senhaValida) {
            return res.render('index', { erro: 'Email ou senha incorretos.', title: 'TCG Deck Builder' });
        }

        req.session.user = { id: user._id, username: user.username };
        res.redirect('/home');
    } catch (erro) {
        res.render('index', { erro: 'Erro ao fazer login.', title: 'TCG Deck Builder' });
    }
});

// ==========================================
// AUTENTICAÇÃO: LOGOUT
// ==========================================
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

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
    } catch (erro) { res.status(500).send('Erro ao carregar a página.'); }
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
            let imagensCapa = [];
            if (deck.pokemons_principais && deck.pokemons_principais.length > 0) {
                for (const pkmn of deck.pokemons_principais) {
                    const cartaApi = await buscarCartaPorNome(pkmn);
                    if (cartaApi && cartaApi.image) imagensCapa.push(cartaApi.image + '/high.png');
                }
            }
            if (imagensCapa.length === 0) imagensCapa.push('https://tcg.pokemon.com/assets/img/global/tcg-card-back-2x.jpg');

            decksFormatados.push({
                id: deck._id, nome: deck.nome, autor: deck.autor || 'Anônimo', favoritos: 0, imagensCapa: imagensCapa
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
    if (!req.session || !req.session.user) {
        return res.redirect('/'); 
    }
    try {
        const meusDecks = await Deck.find({ autor: req.session.user.username }).lean();
        const decksComCapa = [];
        for (const deck of meusDecks) {
            let imagensCapa = [];
            if (deck.pokemons_principais && deck.pokemons_principais.length > 0) {
                for (const pkmn of deck.pokemons_principais) {
                    const cartaApi = await buscarCartaPorNome(pkmn);
                    if (cartaApi && cartaApi.image) imagensCapa.push(cartaApi.image + '/high.png');
                }
            }
            if (imagensCapa.length === 0) imagensCapa.push('https://tcg.pokemon.com/assets/img/global/tcg-card-back-2x.jpg');

            decksComCapa.push({ id: deck._id, nome: deck.nome, imagensCapa: imagensCapa });
        }
        res.render('seus-decks', { paginaAtual: 'seus-decks', decks: decksComCapa });
    } catch (erro) { res.status(500).send('Erro ao carregar os teus decks.'); }
});

// ==========================================
// CRIAR DECK (Passo 1: Escolher Pokémons Principais)
// ==========================================
router.get('/criar-deck', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/'); 
    }
    res.render('criar-deck', { paginaAtual: 'criar-deck' });
});

// ==========================================
// CRIAR DECK (Passo 2: Montar o Deck com Recomendações)
// ==========================================
router.get('/montar-deck', async (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/'); 
    }
    
    let pokemonsPrincipais = [];
    if (req.query.pokemons) {
        try { pokemonsPrincipais = JSON.parse(req.query.pokemons); } 
        catch (e) { console.error("Erro ao ler pokemons selecionados."); }
    }

    // --- ALGORITMO DE RECOMENDAÇÃO HÍBRIDO ---
    let recomendacoes = [];
    try {
        // 1. Procura no banco os decks que têm os Pokémon escolhidos
        const decksRelacionados = await Deck.find({
            pokemons_principais: { $in: pokemonsPrincipais }
        });

       // 2. Conta a frequência (pontos de sinergia) com segurança de formato
        const sinergia = {};
        decksRelacionados.forEach(deck => {
            deck.cartas.forEach(carta => {
                if (carta.carta_id_api) {
                    // Guarda tudo em minúsculas para garantir que "Dreepy" seja lido igual a "dreepy"
                    const chave = carta.carta_id_api.toLowerCase().trim();
                    sinergia[chave] = (sinergia[chave] || 0) + 1;
                }
            });
        });

        // 3. Busca a lista leve de TODAS as cartas na TCGdex de uma vez (1 única requisição rápida)
        const resTodas = await fetch('https://api.tcgdex.net/v2/pt/cards');
        const todasCartas = await resTodas.json();

        if (Array.isArray(todasCartas)) {
            // 4. Filtra apenas as do formato competitivo atual (para não trazer cartas velhas)
            let cartasValidas = todasCartas.filter(c => {
                if (!c.image) return false;
                const id = c.id.toLowerCase();
                
                // Permite Promos, Energias e SV5 em diante (Marcação H+)
                if (id.startsWith('svp') || id.startsWith('sve')) return true;
                const matchSV = id.match(/^sv(\d+)/);
                if (matchSV && parseInt(matchSV[1]) >= 5) return true;
                
                return false;
            });

            // 5. ORDENAÇÃO DE SINERGIA: 
            cartasValidas.sort((a, b) => {
            const idA = a.id ? a.id.toLowerCase() : '';
            const nomeA = a.name ? a.name.toLowerCase() : '';
            // Pontua se bater com o ID OU com o Nome salvo no banco
            const scoreA = (sinergia[idA] || 0) + (sinergia[nomeA] || 0);

            const idB = b.id ? b.id.toLowerCase() : '';
            const nomeB = b.name ? b.name.toLowerCase() : '';
            const scoreB = (sinergia[idB] || 0) + (sinergia[nomeB] || 0);

            // Maior pontuação (sinergia) vai para o topo
            if (scoreB !== scoreA) {
                return scoreB - scoreA; 
            }
            
            // Desempate: Se as cartas tiverem a mesma pontuação (ex: 0), ordena por ordem alfabética
            return a.name.localeCompare(b.name);
        });

            // 6. Cortamos em 150 cartas para a página carregar rápido e não travar o browser
            recomendacoes = cartasValidas.slice(0, 150).map(c => ({
                id: c.id,
                nome: c.name,
                imagem: c.image + '/high.png'
            }));
        }
    } catch (error) {
        console.error("Erro ao gerar recomendações:", error);
    }

    res.render('montar-deck', { 
        paginaAtual: 'criar-deck',
        pokemonsPrincipais: pokemonsPrincipais,
        recomendacoes: recomendacoes
    });
});

// ==========================================
// SALVAR DECK (Passo Final)
// ==========================================
router.post('/salvar-deck', async (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ erro: 'Utilizador não autenticado.' });
    }

    try {
        const { nome, pokemonsPrincipais, cartas } = req.body || {};
        const nomeDeck = typeof nome === 'string' ? nome.trim() : '';

        if (!nomeDeck || !Array.isArray(cartas) || cartas.length === 0) {
            return res.status(400).json({ erro: 'O deck precisa de um nome e pelo menos uma carta.' });
        }

        if (cartas.some(carta =>
            !carta ||
            typeof carta.carta_id_api !== 'string' ||
            !carta.carta_id_api.trim() ||
            !Number.isInteger(carta.quantidade) ||
            carta.quantidade < 1 ||
            carta.quantidade > 4
        )) {
            return res.status(400).json({ erro: 'As cartas do deck são inválidas.' });
        }

        const novoDeck = new Deck({
            nome: nomeDeck,
            autor: req.session.user.username,
            pokemons_principais: Array.isArray(pokemonsPrincipais)
                ? pokemonsPrincipais.filter(pokemon => typeof pokemon === 'string')
                : [],
            cartas
        });

        await novoDeck.save();
        res.status(200).json({ sucesso: true, redirect: '/seus-decks' });
    } catch (erro) {
        console.error('Erro ao salvar deck:', erro);
        res.status(500).json({ erro: 'Erro interno ao salvar o deck.' });
    }
});

module.exports = router;