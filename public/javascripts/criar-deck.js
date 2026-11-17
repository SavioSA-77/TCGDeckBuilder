const searchBar = document.getElementById('searchBar');
const resultsGrid = document.getElementById('resultsGrid');
const loading = document.getElementById('loading');
const selectedCardsContainer = document.getElementById('selectedCardsContainer');
const hiddenPokemons = document.getElementById('hiddenPokemons');
const btnContinuar = document.getElementById('btnContinuar');

let timeoutId;
let selecionados = []; // Array de objetos { id, nome, imagem }

// Evento que dispara enquanto o utilizador digita
searchBar.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    clearTimeout(timeoutId);

    if (query.length < 3) {
        resultsGrid.innerHTML = '';
        return;
    }

    loading.style.display = 'block';
    resultsGrid.innerHTML = '';

    // Debounce: Aguarda 500ms de pausa na digitação para fazer o fetch
    timeoutId = setTimeout(() => {
        buscarNaAPI(query);
    }, 500);
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
                // Corta as eras velhas que já sabemos os prefixos óbvios para economizar busca
                if (id.match(/^(swsh|sm|xy|bw|hgss|pl|dp|ex|ecard|neo|gym|base|ru|pop|mcd|cel)/)) return false;
                return true;
            }).slice(0, 30); // Pega as 30 melhores candidatas

            // 2. A SOLUÇÃO DEFINITIVA: Buscar detalhes para verificar a "Regulation Mark"
            const promessas = candidatas.map(async (c) => {
                try {
                    const detalheRes = await fetch(`https://api.tcgdex.net/v2/en/cards/${c.id}`);
                    if (detalheRes.ok) return await detalheRes.json();
                } catch (e) {}
                return null;
            });

            // Espera a API devolver os detalhes (rápido e invisível para o utilizador)
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

                return false; // Se não tem H, I ou J (ou é G, F, E, sem marca), BLOQUEIA.
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

            renderizarResultados(resultadosFinais);
        }
    } catch (error) {
        console.error("Erro na busca:", error);
        resultsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Erro ao contactar a API.</p>';
    } finally {
        loading.style.display = 'none';
    }
}

function renderizarResultados(cartas) {
    if (cartas.length === 0) {
        resultsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Nenhuma carta encontrada para o formato atual.</p>';
        return;
    }

    cartas.forEach(carta => {
        const imgUrl = carta.image + '/high.png';
        const isSelected = selecionados.find(s => s.id === carta.id);

        const div = document.createElement('div');
        div.className = `card-selectable ${isSelected ? 'selected' : ''}`;
        div.innerHTML = `<img src="${imgUrl}" alt="${carta.name}">`;

        div.addEventListener('click', () => toggleSelecao(carta.id, carta.name, imgUrl, div));
        resultsGrid.appendChild(div);
    });
}

function toggleSelecao(id, nome, imagem, elementoCard) {
    const index = selecionados.findIndex(s => s.id === id);

    if (index > -1) {
        // Remove se já estiver selecionado
        selecionados.splice(index, 1);
        elementoCard.classList.remove('selected');
    } else {
        // Adiciona se houver espaço (máximo 3)
        if (selecionados.length >= 3) {
            alert('Só podes escolher até 3 Pokémons principais!');
            return;
        }
        selecionados.push({ id, nome, imagem });
        elementoCard.classList.add('selected');
    }
    atualizarBarraSelecao();
}

function atualizarBarraSelecao() {
    selectedCardsContainer.innerHTML = '';

    if (selecionados.length === 0) {
        selectedCardsContainer.innerHTML = '<span style="font-size: 12px; color: #aaa; margin-top: 5px;">Nenhum Pokémon selecionado ainda.</span>';
        btnContinuar.disabled = true;
        hiddenPokemons.value = '';
        return;
    }

    btnContinuar.disabled = false;

    // Extrai apenas os nomes exatos para mandar para o backend
    const nomesSelecionados = selecionados.map(s => s.nome);
    hiddenPokemons.value = JSON.stringify(nomesSelecionados);

    // Exibe as miniaturas no rodapé
    selecionados.forEach(s => {
        const img = document.createElement('img');
        img.src = s.imagem;
        img.className = 'selected-card-mini';
        img.title = s.nome;
        selectedCardsContainer.appendChild(img);
    });
}