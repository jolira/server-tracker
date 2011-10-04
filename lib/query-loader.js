var _ = require('underscore');
var openDB = require('./db');
var db;

process.on("config", function(config, callback) {
  openDB(config.mongo, function(_db) {
    db = _db;
    callback();
  });
});

function query(body, callback) {
    callback({});
}

process.on("message", function(body, callback) {
    query(body, callback);
});
