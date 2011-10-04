var _ = require('underscore');
var openDB = require('./db');
var db;

process.on("config", function(config, callback) {
  openDB(config.mongo, function(_db) {
    db = _db;
    callback();
  });
});

