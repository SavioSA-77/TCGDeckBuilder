# 🎴 PokéBuilder

**PokéBuilder** é uma plataforma web completa desenvolvida para jogadores e entusiastas de **Pokémon Trading Card Game (TCG)** criarem, gerenciarem e compartilharem seus baralhos competitivos com rapidez e precisão.

---

## 🎯 Objetivo do Projeto

Construir um deck competitivo no Pokémon TCG exige atenção rigorosa às regras de rotação do formato Standard e um bom conhecimento de sinergia entre cartas. O **PokéBuilder** nasceu para simplificar esse processo, oferecendo uma interface intuitiva que:
* Filtra automaticamente as cartas válidas na rotação competitiva atual (**Marcas de Regulação H, I e J**, além de Energias Básicas), espelhando as regras oficiais do *Pokémon TCG Live*.
* Auxilia na construção de estratégias através de um **sistema inteligente de recomendações** baseado nos baralhos criados pela comunidade.

---

## ✨ Principais Funcionalidades

* **🔍 Busca Rigorosa por Rotação Competitiva:** Integração em tempo real com a API **TCGdex**, validando a marca de regulação de cada carta para garantir que apenas cartas legais no formato Standard atual sejam exibidas.
* **🧠 Algoritmo Híbrido de Recomendação:** Ao selecionar de 1 a 3 Pokémon principais para o seu deck, o sistema analisa o banco de dados para sugerir as cartas com maior índice de sinergia e frequência de uso junto àqueles Pokémon.
* **🛠️ Montagem e Edição Completa de Decks:**
  * Controle dinâmico de quantidade de cartas (respeitando o limite oficial de **60 cartas** por baralho e o máximo de **4 cópias** por carta, com exceção para Energias Básicas).
  * Fluxo unificado para criar novos decks ou editar baralhos já salvos.
* **🕵️ Modo Anônimo:** Opção para publicar baralhos na galeria da comunidade ocultando o nome do autor visualmente, enquanto mantém o vínculo de propriedade e edição seguro no banco de dados.
* **📂 Gestão de Coleção Pessoal:** Área dedicada (*Seus Decks*) para visualizar, editar ou excluir os baralhos criados pelo usuário.

---

## 🛠️ Tecnologias Utilizadas

* **Back-end:** Node.js, Express.js
* **Banco de Dados:** MongoDB & Mongoose
* **Front-end:** EJS (Embedded JavaScript Templates), CSS3, JavaScript (ES6+ Vanilla)
* **API Externa:** [TCGdex API](https://www.tcgdex.net/) (dados e imagens em alta definição das cartas)
