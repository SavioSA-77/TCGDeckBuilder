var express = require('express');
var router = express.Router();
const Deck = require('../models/deck');
const User = require('../models/users');
const bcrypt = require('bcrypt');
const Carta = require('../models/carta'); // Confirme se o caminho/nome estão corretos

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
                id: deck._id, 
                nome: deck.nome, 
                // Se for anônimo, mostra Anônimo pro público; se não, mostra o nome real
                autor: deck.isAnonimo ? 'Anônimo' : (deck.autor || 'Anônimo'), 
                favoritos: 0, 
                imagensCapa: imagensCapa
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

    // --- ALGORITMO DE RECOMENDAÇÃO ATUALIZADO ---
    let recomendacoes = [];
    try {
        // 1. Procura no banco os decks que têm os Pokémon escolhidos
        const decksRelacionados = await Deck.find({
            pokemons_principais: { $in: pokemonsPrincipais }
        });

       // 2. Conta a frequência (pontos de sinergia)
        const sinergia = {};
        decksRelacionados.forEach(deck => {
            deck.cartas.forEach(carta => {
                if (carta.carta_id_api) {
                    const chave = carta.carta_id_api.toLowerCase().trim();
                    sinergia[chave] = (sinergia[chave] || 0) + 1;
                }
                // Adiciona sinergia também pelo nome para garantir
                if (carta.nome) {
                    const chaveNome = carta.nome.toLowerCase().trim();
                    sinergia[chaveNome] = (sinergia[chaveNome] || 0) + 1;
                }
            });
        });

        // 3. Busca a lista leve de TODAS as cartas
        const resTodas = await fetch('https://api.tcgdex.net/v2/en/cards');
        const todasCartas = await resTodas.json();

        if (Array.isArray(todasCartas)) {
            let cartasValidas = [];

            todasCartas.forEach(c => {
                if (!c.image) return;
                
                const id = c.id.toLowerCase();
                const nome = c.name ? c.name.toLowerCase() : '';
                
                // REGRA 1: PASSE LIVRE (Sinergia)
                // Se você já usou essa carta no banco com esse Pokémon, ela entra direto!
                // Não importa se é Hariyama (Pokémon), Treinador ou velha. Entra.
                if (sinergia[id] || sinergia[nome]) {
                    cartasValidas.push(c);
                    return; 
                }

                // REGRA 2: PREENCHER COM CARTAS DO FORMATO ATUAL
                // Se a carta NÃO foi usada no banco, nós filtramos para mostrar apenas as válidas.
                
                // Corta as eras antigas conhecidas
                const erasAntigas = /^(swsh|sm|xy|bw|hgss|pl|dp|ex|ecard|neo|gym|base|ru|pop|mcd|cel)/;
                if (erasAntigas.test(id)) return;

                if (id.startsWith('sv')) {
                    // Energias Básicas
                    if (id.startsWith('sve')) {
                        cartasValidas.push(c);
                        return;
                    }
                    // Promos a partir de SVP-086 (Marca H+)
                    if (id.startsWith('svp')) {
                        const matchPromo = id.match(/svp[^\d]*(\d+)/);
                        if (matchPromo && parseInt(matchPromo[1]) >= 86) cartasValidas.push(c);
                        return;
                    }
                    // Coleções regulares (SV5 para cima)
                    const matchSV = id.match(/^sv(\d+)/);
                    if (matchSV) {
                        if (parseInt(matchSV[1]) >= 5) cartasValidas.push(c);
                        return;
                    }
                    // Bloqueia sub-sets G (como sv4pt5)
                    if (id.includes('sv4pt5')) return;
                    
                    // Passa o resto (sets especiais novos da era SV)
                    cartasValidas.push(c);
                    return;
                }

                // Prefixo desconhecido (Coleções futuras I e J), deixamos passar
                cartasValidas.push(c);
            });

            // 4. ORDENAÇÃO: Coloca as que têm mais sinergia no Topo absoluto e o restante em ordem alfabética
cartasValidas.sort((a, b) => {
    const idA = a.id ? a.id.toLowerCase() : '';
    const nomeA = a.name ? a.name.toLowerCase().trim() : '';
    const scoreA = (sinergia[idA] || 0) + (sinergia[nomeA] || 0);

    const idB = b.id ? b.id.toLowerCase() : '';
    const nomeB = b.name ? b.name.toLowerCase().trim() : '';
    const scoreB = (sinergia[idB] || 0) + (sinergia[nomeB] || 0);

    // Primeiro critério: quem tem mais pontos de sinergia vem antes
    if (scoreB !== scoreA) {
        return scoreB - scoreA;
    }
    
    // Segundo critério (empate ou zero sinergia): ordem alfabética pelo nome da carta
    return (a.name || '').localeCompare(b.name || '');
});

            // 5. Cortamos em 400 cartas para mostrar muitas opções na tela
            recomendacoes = cartasValidas.slice(0, 400).map(c => ({
                id: c.id,
                nome: c.name ? c.name.replace(/'/g, "\\'") : '',
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
// SALVAR DECK (Criação e Edição)
// ==========================================
router.post('/salvar-deck', async (req, res) => {
    if (!req.session || !req.session.user) return res.status(401).json({ erro: 'Não autenticado.' });

    try {
        const { deckId, nome, pokemonsPrincipais, cartas, anonimo } = req.body;
        const nomeDeck = typeof nome === 'string' ? nome.trim() : '';

        const totalCartas = cartas.reduce((soma, carta) => soma + (Number(carta.quantidade) || 0), 0);
        if (totalCartas !== 60) return res.status(400).json({ erro: `Um deck válido precisa de 60 cartas!` });

        // O autor no back-end SEMPRE será o usuário logado
        const autorReal = req.session.user.username;
        const modoAnonimoAtivado = anonimo === true; // true ou false

        if (deckId) {
            // ----- MODO EDIÇÃO -----
            const deckExistente = await Deck.findById(deckId);
            if (!deckExistente) return res.status(404).json({ erro: 'Deck não encontrado.' });
            
            if (deckExistente.autor !== req.session.user.username) {
                return res.status(403).json({ erro: 'Sem permissão para editar.' });
            }

            // Atualiza os dados
            deckExistente.nome = nomeDeck;
            deckExistente.cartas = cartas;
            deckExistente.pokemons_principais = pokemonsPrincipais;
            deckExistente.autor = autorReal; // Nunca perde a posse!
            deckExistente.isAnonimo = modoAnonimoAtivado; // Salva o estado do checkbox

            await deckExistente.save();
            return res.status(200).json({ sucesso: true, redirect: '/seus-decks' });
        } else {
            // ----- MODO CRIAÇÃO (Novo Deck) -----
            const novoDeck = new Deck({
                nome: nomeDeck,
                autor: autorReal,             // Dono real
                isAnonimo: modoAnonimoAtivado,// Estado visual
                pokemons_principais: pokemonsPrincipais,
                cartas
            });
            await novoDeck.save();
            return res.status(200).json({ sucesso: true, redirect: '/seus-decks' });
        }
    } catch (erro) {
        console.error('Erro ao salvar deck:', erro);
        res.status(500).json({ erro: 'Erro interno ao salvar.' });
    }
});

// ==========================================
// DELETAR DECK (Apenas o Autor)
// ==========================================
router.post('/deletar-deck/:id', async (req, res) => {
    // 1. Verifica se o utilizador tem sessão iniciada
    if (!req.session || !req.session.user) {
        return res.status(401).send('Utilizador não autenticado.');
    }

    try {
        const deckId = req.params.id;
        const deckDoBanco = await Deck.findById(deckId);

        if (!deckDoBanco) {
            return res.status(404).send('Deck não encontrado.');
        }

        // 2. SEGURANÇA: Verifica se o nome do utilizador logado é igual ao autor do deck
        if (deckDoBanco.autor !== req.session.user.username) {
            return res.status(403).send('Sem permissão: Apenas o criador original pode deletar este deck.');
        }

        // 3. Se passou na verificação de segurança, apaga do MongoDB
        await Deck.findByIdAndDelete(deckId);
        
        // Redireciona de volta para a página dos decks do utilizador
        res.redirect('/seus-decks');
    } catch (erro) {
        console.error('Erro ao deletar deck:', erro);
        res.status(500).send('Erro interno ao deletar o deck.');
    }
});

// ==========================================
// ABRIR TELA DE EDIÇÃO DE DECK (CORRIGIDA)
// ==========================================
router.get('/editar-deck/:id', async (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/');
    }

    try {
        const deck = await Deck.findById(req.params.id);

        if (!deck) {
            return res.status(404).send('Deck não encontrado.');
        }

        // Segurança: só o autor pode abrir a edição
        if (deck.autor !== req.session.user.username) {
            return res.status(403).send('Sem permissão para editar este deck.');
        }

        // --- ALGORITMO DE RECOMENDAÇÃO HÍBRIDO (Copiado da rota /montar-deck) ---
        let recomendacoesEncontradas = [];
        let pokemonsPrincipais = deck.pokemons_principais || [];
        
        try {
            // 1. Procura no banco os decks que têm os Pokémon escolhidos
            const decksRelacionados = await Deck.find({
                pokemons_principais: { $in: pokemonsPrincipais }
            });

            // 2. Conta a frequência (pontos de sinergia)
            const sinergia = {};
            decksRelacionados.forEach(d => {
                d.cartas.forEach(carta => {
                    if (carta.carta_id_api) {
                        const chave = carta.carta_id_api.toLowerCase().trim();
                        sinergia[chave] = (sinergia[chave] || 0) + 1;
                    }
                });
            });

            // 3. Busca a lista leve de TODAS as cartas
            const resTodas = await fetch('https://api.tcgdex.net/v2/en/cards');
            const todasCartas = await resTodas.json();

            if (Array.isArray(todasCartas)) {
                let cartasValidas = [];
                let cartasAntigasNoBanco = []; 

                todasCartas.forEach(c => {
                    if (!c.image) return;
                    
                    const id = c.id.toLowerCase();
                    const nome = c.name ? c.name.toLowerCase() : '';
                    
                    let formatoValido = false;
                    if (id.startsWith('svp') || id.startsWith('sve')) formatoValido = true;
                    const matchSV = id.match(/^sv(\d+)/);
                    if (matchSV && parseInt(matchSV[1]) >= 5) formatoValido = true;

                    if (formatoValido) {
                        cartasValidas.push(c);
                    } else if (sinergia[id] || sinergia[nome]) {
                        cartasAntigasNoBanco.push(c);
                    }
                });

                // 4. A "Exceção de Ouro"
                const verificacoes = cartasAntigasNoBanco.map(async (c) => {
                    try {
                        const resCarta = await fetch(`https://api.tcgdex.net/v2/en/cards/${c.id}`);
                        if (resCarta.ok) {
                            const dados = await resCarta.json();
                            if (dados.category === 'Trainer' || dados.category === 'Energy') return c; 
                        }
                    } catch(e) {}
                    return null;
                });

                const antigasLiberadas = (await Promise.all(verificacoes)).filter(c => c !== null);
                let todasAprovadas = [...cartasValidas, ...antigasLiberadas];

                // 5. ORDENAÇÃO DE SINERGIA
                todasAprovadas.sort((a, b) => {
                    const idA = a.id ? a.id.toLowerCase() : '';
                    const nomeA = a.name ? a.name.toLowerCase() : '';
                    const scoreA = (sinergia[idA] || 0) + (sinergia[nomeA] || 0);

                    const idB = b.id ? b.id.toLowerCase() : '';
                    const nomeB = b.name ? b.name.toLowerCase() : '';
                    const scoreB = (sinergia[idB] || 0) + (sinergia[nomeB] || 0);

                    if (scoreB !== scoreA) return scoreB - scoreA; 
                    return a.name.localeCompare(b.name);
                });

                // 6. Formata para o Front-end
                recomendacoesEncontradas = todasAprovadas.slice(0, 400).map(c => ({
                    id: c.id,
                    nome: c.name ? c.name.replace(/'/g, "\\'") : '',
                    imagem: c.image + '/high.png'
                }));
            }
        } catch (error) {
            console.error("Erro ao gerar recomendações na edição:", error);
        }
        // -------------------------------------------------------------

        // Renderiza a página (Aqui você pode passar paginaAtual ou deckEditando conforme seu EJS exigir)
        res.render('montar-deck', {
            paginaAtual: 'seus-decks', // Pra marcar no menu lateral, caso tenha
            pokemonsPrincipais: pokemonsPrincipais,
            recomendacoes: recomendacoesEncontradas,
            deckEditando: deck
        });
    } catch (erro) {
        console.error('Erro ao buscar deck para edição:', erro);
        res.status(500).send('Erro interno.');
    }
});


module.exports = router;