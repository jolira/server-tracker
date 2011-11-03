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

function updateAddMapReducedDone(collection, callback) {
  collection.update({ _mapReduced : "pending" }, { $set : { _mapReduced : "done" } }, { multi : true }, function(err){
    return callback(err);
  });
}

function updateAddMapReducedPending(collection, _qualifier, callback) {
  var qualifier = copy(_qualifier) || {};

  qualifier._mapReduced = { "$exists": false };
  collection.update(qualifier, { $set : { _mapReduced : "pending" } }, { multi : true }, function(err){
    return callback(err);
  });
}

function performActuaMapReduce(collection, entry, callback) {
  collection.mapReduce(map, reduce, {
    "out" : { "reduce" : entry.out },
    "query" : { _mapReduced : "pending" }
  }, function (err, collection) {
    callback(err, collection);
  });
}

function Loader(entry, db) {
  this.entry = entry;
  this.db = db;
}

Loader.prototype.mapReduce = function(callback) {
  var entry = this.entry;
  this.db.collection(entry.collection, function (error, collection) {
    if (error) {
      return callback({
        "error": error
      });
    }
    updateAddMapReducedPending(collection, entry.qualifier, function (err) {
      if (error) {
        return callback({
          "error": error
        });
      }
      performActuaMapReduce(collection, entry, function () {
        updateAddMapReducedDone(collection, callback);
      });
    });
  });
};

process.on("config", function(cfg, callback) {
  var entry = cfg.entry;
  openDB(cfg.mongo, function(db) {
    loader = new Loader(entry, db);
    callback();
  });
});

process.on('message', function(message, callback) {
  loader.mapReduce(callback);
});

/*
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
  ` }
  });
}
*/
