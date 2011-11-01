var _ = require("underscore");
var openDB = require('./db');
var loader;

function copy(dict) {
  var duplicate = {};
  _.each(dict, function(value, key){
    duplicate[key] = value;
  });
  return duplicate;
}

function Loader(entry, db) {
  this.entry = entry;
  this.db = db;
}

Loader.prototype.mapReduce = function(callback) {
  var entry = this.entry;
  var collectionName = entry.collection;

  this.db.collection(entry.collection, function (error, collection) {
    if (error) {
      callback({
        "error": error
      });
      return;
    }
    group(collection, req, function (stats) {
      callback(stats);
    });
  });
  var quaifier = copy(entry.qualifier);

  qualifier._mapReduced = { "$exists": false };
  this.db.collection(entry.collectionName, function(err, collection));
};

process.on("config", function(cfg, callback) {
  var entry = cfg.entry;
  counter = entry["restart-count"];
  openDB(cfg.mongo, function(_db) {
    loader = new Loader(entry, db);
    callback();
  });
});

process.on('message', function(message, callback) {
    loader.mapReduce(callback);
});

function mapReduce(collection, callback) {
    var end = Date.now();
    var start = end - 60 * 1000;
    collection.mapReduce(map, reduce, {
      "out" : { "replace" : collection.collectionName + "-mapreduced" },
      "query" : {
        mbean : "java.lang:type=Memory",
        timestamp: { "$gte" : start, "$lte" : end },
        _mapReduced : { "$exists" : false }
      }
    }, function (err, collection) {
        if (err) {
            return console.error(err);
        }
    });
}
