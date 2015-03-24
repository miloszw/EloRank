var RSVP = require('rsvp');
var _ = require('underscore');
var express = require('express');
var app = express();

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
          console.log("Added alts to row id" + i);
          resolve();
        });
      })
    });

    RSVP.all(promises).then(function() {
      console.log("Sent response!");
      res.send(rows);
      res.end();
    });
  });

});



// on ctrl-c
process.on('SIGINT', function() {
  connection.end();
  console.log("\nExiting...");
  process.exit();
});
