// timeout in ms to simulate delay (debug)
TIMEOUT = 0

// web modules
var jsonParser  = require('body-parser').json();
var express     = require('express');
var app         = express();

// other modules
var RSVP  = require('rsvp');
var _     = require('underscore');
var elo   = require('./elo');

// serve static files
app.use(express.static('./public'));

// create db connection
var connection = require('./db');
connection.connect();
console.log("Established connection to database.");

// start listening
app.listen(8080);
console.log("Listening on 8080...");

// routes
app.get('/polls/:id(\\d+)?', function(req, res) {
  if (!req.params.id) {
    var sql = 'SELECT * FROM polls';
  } else {
    var sql = 'SELECT * FROM polls WHERE id=' + req.params.id;
  }

  connection.query(sql, function(err, rows, fields) {
    if (err) throw err;

    // get alternatives for each poll
    var promises = _.range(0,rows.length)
    .map(function(i) {
      return new RSVP.Promise(function(resolve, reject) {
        connection.query('SELECT * FROM alternatives WHERE polls_id=?',
        rows[i].id, function(err, rowsAlt, fields) {
          if (err) throw err;
          rows[i].alternatives = rowsAlt;
          resolve();
        });
      })
    });

    RSVP.all(promises).then(function() {
      setTimeout(function() {
        res.send(rows);
        res.end();
      }, TIMEOUT);
    });
  });

});

app.get('/polls/:id(\\d+)/challenge', function(req, res) {
  connection.query('SELECT id FROM alternatives WHERE polls_id=?' +
  ' ORDER BY ranked_times DESC LIMIT 2', req.params.id,
  function(err, rows, fields) {
    if (err) throw err;

    // create challenge
    connection.query('INSERT INTO challenges(poll_id, alt1_id, alt2_id) ' +
    'VALUES (?, ?, ?)', [req.params.id, rows[0].id, rows[1].id],
    function(err, rowsAlt, fields) {
      if (err) throw err;
      // send response containing alternative ids
      res.status(201).json({
        alt1: rows[0].id,
        alt2: rows[1].id
      });
      res.end();
    });

  });
});


app.post('/polls/:id(\\d+)/challenge', jsonParser, function(req, res) {
  connection.query('SELECT * FROM challenges WHERE id=?',
  req.body.id, function(err, rows, fields) {
    if (err) throw err;

    // get alternative
    connection.query('SELECT * FROM alternatives WHERE id=? or ?',
    [rows[0].alt1_id, rows[0].alt2_id], function(err, rowsAlt, fields) {
      if (err) throw err;

      altProps = [{
        "id": rowsAlt[0].id,
        "score": rowsAlt[0].score,
        "ranked_times" :rowsAlt[0].ranked_times
      },{
        "id": rowsAlt[1].id,
        "score": rowsAlt[1].score,
        "ranked_times" :rowsAlt[1].ranked_times
      }];

      // update alternative's scores
      updateAlternatives(req.body.result, altProps, function() {
        // delete challenge
        connection.query('DELETE FROM challenges WHERE id=?',
        req.body.id, function(err, rowsAlt, fields) {
          if (err) throw err;
          res.status(200).send("Results were successfully recorded!");
          res.end();
        });
      });
    });
  });
});

var updateAlternatives = function(result, altProps, callback) {
  var alt1Score = altProps[0].score;
  var alt2Score = altProps[1].score;
  var newScore  = elo.calcScore(result, alt1Score, alt2Score);

  var set = [{
    "id": altProps[0].id,
    "score": newScore[0],
    "ranked_times": ++altProps[0].ranked_times
  }, {
    "id": altProps[1].id,
    "score": newScore[1],
    "ranked_times": ++altProps[1].ranked_times
  }];

  var promises = [0,1].map(function(i) {
    return new RSVP.Promise(function(resolve, reject) {
      connection.query('UPDATE alternatives SET ? WHERE id=?', [set[i], set[i].id],
      function(err, rows, fields) {
        if (err) throw err;
        resolve();
      });
    })
  });

  RSVP.all(promises).then(function() {
    callback();
  });
}



// on ctrl-c
process.on('SIGINT', function() {
  connection.end();
  console.log("\nExiting...");
  process.exit();
});
