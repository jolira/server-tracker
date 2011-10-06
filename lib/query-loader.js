var openDB = require('./db');
var query = require('./query-series');
var queryConfig = require('./query-config');
var config;
var db;
process.on("config", function(_config, callback) {
  config = _config;
  openDB(_config.mongo, function(_db) {
    db = _db;
    callback();
  });
});

process.on("message", function(body, callback) {
  if ("config" === body.type) {
    queryConfig(config, callback);
  } else {
    query(db, body, callback);
  }
});