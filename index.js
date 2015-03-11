var express = require('express');

var app = express();

app.use(express.static('./public'));

app.listen(8080);
console.log("Listening on 8080...");

var connection = require('./db');
connection.connect();
console.log("Established connection to database.");


app.get('/polls', function(req, res) {
    connection.query('SELECT * FROM polls', function(err, rows, fields) {
      if (err) throw err;

      res.send(rows);
  });
});



// on ctrl-c
process.on('SIGINT', function() {
    connection.end();
    console.log("Exiting...");
    process.exit();
});
