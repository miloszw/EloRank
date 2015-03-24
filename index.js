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
app.get('/polls', function(req, res) {
    connection.query('SELECT * FROM polls', function(err, rows, fields) {
      if (err) throw err;

      res.send(rows);
  });
});



// on ctrl-c
process.on('SIGINT', function() {
    connection.end();
    console.log("\nExiting...");
    process.exit();
});
