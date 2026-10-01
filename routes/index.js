var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
  res.render('index', { title: 'TCG Deck Builder' });
});

router.get('/homepage', function(req, res) {
  res.render('homepage', {
    title: 'TCG Deck Builder',
    cards: Array.from({ length: 8 }, function() { return {}; })
  });
});

module.exports = router;
