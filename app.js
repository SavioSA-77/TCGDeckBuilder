var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(express.json());

const Carta = require('./models/carta'); // Importa o modelo
const Deck = require('./models/deck'); // Importa o modelo


// Rota para criar uma nova carta'
app.post('/cartas', async (req, res) => {
  try {
    // req.body contém os dados enviados (foto, nome, etc)
    const novaCarta = new Carta(req.body); 
    const cartaSalva = await novaCarta.save(); // Salva no MongoDB
    
    res.status(201).json(cartaSalva); // Retorna a carta criada com sucesso
  } catch (erro) {
    res.status(400).json({ erro: 'Erro ao criar carta', detalhes: erro.message });
  }
});

// Rota para criar um novo deck
app.post('/decks', async (req, res) => {
  try {
    const novoDeck = new Deck(req.body);
    const deckSalvo = await novoDeck.save();
    
    res.status(201).json(deckSalvo);
  } catch (erro) {
    res.status(400).json({ erro: 'Erro ao criar deck', detalhes: erro.message });
  }
});


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;


const mongoose = require('mongoose'); // 1. Importe o mongoose



// 2. Defina a string de conexão local
// O "tcgdeckbuilder" no final será o nome do seu banco de dados (ele é criado automaticamente)
const mongoURI = 'mongodb://127.0.0.1:27017/tcgdeckbuilder';

// 3. Inicie a conexão
mongoose.connect(mongoURI)
  .then(() => console.log('Conectado ao MongoDB com sucesso!'))
  .catch((err) => console.error('Erro ao conectar ao MongoDB:', err));

// ... resto do seu código (configuração de rotas, views, etc.)
