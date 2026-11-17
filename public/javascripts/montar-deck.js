// --- 1. CONFIGURAÇÃO DE ESTADO ---
const deckState = {}; // { id: { id, nome, quantidade } }
const pokemonsPrincipais = JSON.parse(document.getElementById('dadosPrincipais').dataset.pokemons || '[]');
const recomendacoesIniciais = JSON.parse(document.getElementById('initialRecommendations').dataset.recommendations || '[]');

// --- 2. ELEMENTOS DO DOM ---
const deckListContainer = document.getElementById('deckListContainer');
const totalCardsEl = document.getElementById('totalCards');
const cardsGrid = document.getElementById('cardsGrid');
const searchBar = document.getElementById('searchBar');
const loading = document.getElementById('loading');
const panelTitle = document.getElementById('panelTitle');
const btnSalvar = document.getElementById('btnSalvar');

// --- 3. CARREGAR DADOS SE ESTIVER A EDITAR ---
const deckEditando = JSON.parse(document.getElementById('deckEditandoData').dataset.deck || 'null');
let deckIdAtual = null;

if (deckEditando) {
    deckIdAtual = deckEditando._id; // Guarda o ID para mandar no botão Salvar
    document.getElementById('deckName').value = deckEditando.nome;

    // Injeta as cartas antigas no state do sistema
    deckEditando.cartas.forEach(c => {
        deckState[c.carta_id_api] = {
            id: c.carta_id_api,
            nome: c.nome || 'Carta (Pesquise para ver a imagem)', // Mostra o nome guardado
            quantidade: c.quantidade,
            categoria: null
        };
    });

    // Desenha as cartas na lista lateral imediatamente
    renderizarDeck();
}

// --- 4. LÓGICA DO DECK (ESQUERDA) ---
async function adicionarCarta(id, nome) {
    const totalAtual = Object.values(deckState).reduce((acc, c) => acc + c.quantidade, 0);

    if (totalAtual >= 60) {
        return alert('O deck já atingiu o limite máximo de 60 cartas!');
    }

    if (!deckState[id]) {
        deckState[id] = { id, nome, quantidade: 1, categoria: null };
    } else {
        if (deckState[id].quantidade >= 4 && !(await podeUltrapassarLimite(deckState[id]))) {
            return;
        }
        deckState[id].quantidade++;
    }
    renderizarDeck();
}

async function adicionarVarias(id, nome, qtdDesejada) {
    const totalAtual = Object.values(deckState).reduce((acc, c) => acc + c.quantidade, 0);
    const espacoNoDeck = 60 - totalAtual;

    if (espacoNoDeck <= 0) {
        return alert('O deck já atingiu o limite máximo de 60 cartas!');
    }

    if (!deckState[id]) {
        deckState[id] = { id, nome, quantidade: 0, categoria: null };
    }

    let qtdPermitida = qtdDesejada;

    if (deckState[id].quantidade + qtdDesejada > 4) {
        const podeUltrapassar = await podeUltrapassarLimite(deckState[id]);
        if (!podeUltrapassar) {
            qtdPermitida = 4 - deckState[id].quantidade;
        }
    }

    const qtdRealParaAdicionar = Math.min(qtdPermitida, espacoNoDeck);

    if (qtdRealParaAdicionar > 0) {
        deckState[id].quantidade += qtdRealParaAdicionar;
        renderizarDeck();
    }
}

async function podeUltrapassarLimite(carta) {
    if (carta.categoria) {
        if (carta.categoria === 'Energy') return true;
        alert('Limite de 4 cópias atingido para esta carta!');
        return false;
    }

    try {
        const response = await fetch(`https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(carta.id)}`);
        if (!response.ok) throw new Error(`TCGdex respondeu com status ${response.status}`);
        const detalhes = await response.json();
        carta.categoria = detalhes.category || 'Unknown';

        if (carta.categoria === 'Energy') return true;
        alert('Limite de 4 cópias atingido para esta carta!');
    } catch (error) {
        console.error('Erro ao verificar a categoria da carta:', error);
        alert('Não foi possível verificar se esta carta é uma Energia. Tente novamente.');
    }
    return false;
}

function alterarQuantidade(id, delta) {
    if (!deckState[id]) return;

    const totalAtual = Object.values(deckState).reduce((acc, c) => acc + c.quantidade, 0);
    if (delta > 0 && totalAtual >= 60) {
        return alert('O deck já atingiu o limite máximo de 60 cartas!');
    }

    if (delta > 0 && deckState[id].quantidade >= 4 && deckState[id].categoria !== 'Energy') {
        return alert('Limite de 4 cópias atingido para esta carta!');
    }

    deckState[id].quantidade += delta;

    if (deckState[id].quantidade <= 0) {
        delete deckState[id]; // Remove se zero
    }
    renderizarDeck();
}

function renderizarDeck() {
    deckListContainer.innerHTML = '';
    let total = 0;

    Object.values(deckState).forEach(carta => {
        total += carta.quantidade;
        const item = document.createElement('div');
        item.className = 'deck-item';

        const nomeCurto = carta.nome.length > 22 ? carta.nome.substring(0, 22) + '...' : carta.nome;

        item.innerHTML = `
            <span title="${carta.nome}">${nomeCurto}</span>
            <div class="qty-controls">
                <button class="qty-btn" onclick="alterarQuantidade('${carta.id}', -1)">-</button>
                <span>${carta.quantidade}</span>
                <button class="qty-btn" onclick="alterarQuantidade('${carta.id}', 1)">+</button>
            </div>
        `;
        deckListContainer.appendChild(item);
    });

    totalCardsEl.innerText = total;
    totalCardsEl.style.color = total === 60 ? '#27ae60' : 'white';
}

// --- 5. LÓGICA DE PESQUISA (DIREITA) ---
let timeoutId;
searchBar.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    clearTimeout(timeoutId);

    if (query.length === 0) {
        restaurarRecomendacoes();
        return;
    }
    if (query.length < 3) return;

    loading.style.display = 'block';
    cardsGrid.innerHTML = '';
    panelTitle.innerHTML = 'Resultados da Pesquisa';

    timeoutId = setTimeout(() => buscarNaAPI(query), 500);
});

async function buscarNaAPI(termo) {
    try {
        const url = `https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(termo)}`;
        const res = await fetch(url);
        const cartas = await res.json();

        if (Array.isArray(cartas)) {
            // 1. Filtro leve para descartar lixo óbvio antes de consultar detalhes
            let candidatas = cartas.filter(c => {
                if (!c || !c.image || !c.id) return false;
                const id = c.id.toLowerCase();
                // Corta as eras velhas conhecidas para economizar buscas
                if (id.match(/^(swsh|sm|xy|bw|hgss|pl|dp|ex|ecard|neo|gym|base|ru|pop|mcd|cel)/)) return false;
                return true;
            }).slice(0, 30); // Limita as buscas simultâneas para não travar

            // 2. A SOLUÇÃO DEFINITIVA: Buscar detalhes para verificar a "Regulation Mark"
            const promessas = candidatas.map(async (c) => {
                try {
                    const detalheRes = await fetch(`https://api.tcgdex.net/v2/en/cards/${c.id}`);
                    if (detalheRes.ok) return await detalheRes.json();
                } catch (e) {}
                return null;
            });

            // Espera a API devolver os detalhes
            const cartasDetalhadas = await Promise.all(promessas);

            // 3. Filtro Implacável por Marca de Rotação (H, I, J)
            let cartasRotacaoAtual = cartasDetalhadas.filter(detalhe => {
                if (!detalhe) return false;

                // Energias Básicas não têm marca de regulação, mas são sempre válidas
                if (detalhe.category === 'Energy' && !detalhe.suffix) return true;
                if (detalhe.id.toLowerCase().startsWith('sve')) return true;

                // Só passa se a marca de regulação for estritamente H, I ou J
                if (detalhe.regulationMark) {
                    const marca = detalhe.regulationMark.toUpperCase();
                    if (['H', 'I', 'J'].includes(marca)) {
                        return true;
                    }
                }

                return false; // Se não tem H, I ou J, BLOQUEIA.
            });

            // 4. Ordena para exibir as mais novas no topo (J primeiro, depois I, depois H)
            cartasRotacaoAtual.sort((a, b) => {
                const peso = (marca) => {
                    if (marca === 'J') return 3;
                    if (marca === 'I') return 2;
                    if (marca === 'H') return 1;
                    return 0;
                };
                return peso(b.regulationMark?.toUpperCase()) - peso(a.regulationMark?.toUpperCase());
            });

            // 5. Formata de volta para o padrão que a sua interface espera
            const resultadosFinais = cartasRotacaoAtual.map(d => ({
                id: d.id,
                name: d.name,
                image: d.image
            }));

            // Chama a sua função de renderizar a grade
            renderizarGrade(resultadosFinais);
        }
    } catch (error) {
        console.error("Erro na busca:", error);
        cardsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Erro ao buscar cartas.</p>';
    } finally {
        loading.style.display = 'none';
    }
}

function renderizarGrade(cartas) {
    cardsGrid.innerHTML = '';
    if (cartas.length === 0) {
        cardsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666; margin-top: 20px;">Nenhuma carta encontrada para o formato atual.</p>';
        return;
    }

    cartas.forEach(carta => {
        const imgUrl = carta.image + '/high.png';
        const nomeSeguro = carta.name ? carta.name.replace(/'/g, "\\'") : '';

        const div = document.createElement('div');
        div.className = 'card-result';
        div.innerHTML = `
            <img src="${imgUrl}" alt="${carta.name}">
            <div class="card-actions">
                <button class="btn-add" onclick="adicionarCarta('${carta.id}', '${nomeSeguro}')">+ 1</button>
                <button class="btn-add warning" onclick="adicionarVarias('${carta.id}', '${nomeSeguro}', 4)">+ 4</button>
            </div>
        `;
        cardsGrid.appendChild(div);
    });
}

function restaurarRecomendacoes() {
    panelTitle.innerHTML = 'Recomendações do Meta <span style="font-size: 14px; font-weight: normal; color: #666;">(Baseado nos seus Pokémons)</span>';
    cardsGrid.innerHTML = '';
    recomendacoesIniciais.forEach(carta => {
        const nomeSeguro = carta.nome ? carta.nome.replace(/'/g, "\\'") : '';

        const div = document.createElement('div');
        div.className = 'card-result';
        div.innerHTML = `
            <img src="${carta.imagem}" alt="${carta.nome}">
            <div class="card-actions">
                <button class="btn-add" onclick="adicionarCarta('${carta.id}', '${nomeSeguro}')">+ 1</button>
                <button class="btn-add warning" onclick="adicionarVarias('${carta.id}', '${nomeSeguro}', 4)">+ 4</button>
            </div>
        `;
        cardsGrid.appendChild(div);
    });
}

// --- 6. SALVAR DECK (EDIÇÃO E CRIAÇÃO) ---
btnSalvar.addEventListener('click', async () => {
    const nomeDeck = document.getElementById('deckName').value.trim();
    const checkAnonimo = document.getElementById('checkAnonimo');
    const isAnonimo = checkAnonimo ? checkAnonimo.checked : false;

    const cartasArray = Object.values(deckState).map(c => ({
        carta_id_api: c.id,
        nome: c.nome, // NOME AGORA É ENVIADO PARA SALVAR
        quantidade: c.quantidade
    }));

    if (!nomeDeck) return alert('Dê um nome ao seu deck!');
    if (cartasArray.length === 0) return alert('Adicione cartas ao seu deck!');

    const totalCartas = cartasArray.reduce((acc, c) => acc + c.quantidade, 0);
    if (totalCartas !== 60) {
        return alert(`O deck precisa ter exatamente 60 cartas! O seu tem atualmente ${totalCartas}.`);
    }

    btnSalvar.disabled = true;
    btnSalvar.innerText = 'Salvando...';

    try {
        const response = await fetch('/salvar-deck', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deckId: deckIdAtual, // ENVIAR ID DO DECK PARA EDITAR (ou null se for novo)
                nome: nomeDeck,
                pokemonsPrincipais: pokemonsPrincipais,
                cartas: cartasArray,
                anonimo: isAnonimo
            })
        });

        const data = await response.json();

        if (response.ok && data.sucesso) {
            window.location.href = data.redirect || '/seus-decks';
        } else {
            alert(data.erro || 'Erro ao salvar deck.');
            btnSalvar.disabled = false;
            btnSalvar.innerText = 'Salvar Deck';
        }
    } catch (error) {
        alert('Erro de comunicação com o servidor.');
        btnSalvar.disabled = false;
        btnSalvar.innerText = 'Salvar Deck';
    }
});
