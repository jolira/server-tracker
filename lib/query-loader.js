var openDB = require('./db');
var query = require('./query-series');
var db;
process.on("config", function(config, callback) {
  openDB(config.mongo, function(_db) {
    db = _db;
    callback();
  });
});

process.on("message", function(body, callback) {
  query(db, body, callback);
});