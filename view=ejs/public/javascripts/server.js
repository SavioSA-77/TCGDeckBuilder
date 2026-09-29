// server.js
const express = require('express');
const app = express();
const path = require('path');

// Configura o EJS como motor de visualização
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Diz ao Express para usar a pasta "public" para os arquivos estáticos (como o CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Rota para a página de login
app.get('/login', (req, res) => {
    res.render('login');
});

// Inicia o servidor
app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000/login');
});