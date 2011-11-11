var openDB = require('./db');
var running = false;
var loader;

function map() {
  function get(obj, accessor) {
    accessor = accessor.split('.');
    for (var idx in accessor) {
      var segment = accessor[idx];
      obj = obj[segment];
      if (!obj) {
        return undefined;
      }
    }
    return obj;
  }

  var result = {};
  var value = result;

  for(var key in entry.groupBy) {
    var _key = get(this, key);

    if (!value[_key]) {
      value[_key] = {};
    }

    value = value[_key];
  }

  for(var name in entry.keys) {
    var key = entry.keys[name];
    var val = get(this, key);

    if (val) {
        value[name] = {
            "min" : val,
            "max" : val,
            "sum" : val,
            "count" : 1
        };
    }
  }

  var timestamp = this.timestamp;
  var intervalsSince1970 = Math.floor(this.timestamp / entry.interval);
  var start = intervalsSince1970 * entry.interval;

  emit(start, result);
}

function reduce(key, values) {
  function reduceOne(result, value) {
    for (var name in value) {
        var v0 = result[name];
        var v1 = value[name];

        if (!v0) {
            result[name] = v1;
        }
        else if (name === "min") {
            if (v1 < v0) {
            result[name] = v1;
            }
            continue;
        }
        else if (name === "max") {
            if (v1 > v0) {
            result[name] = v1;
            }
        }
        else if (name === "sum" || name === "count") {
            result[name] = v0 + v1;
        }
        else {
            reduceOne(v0, v1);
        }
    }
  }
  var result = {};

  for(var idx in values) {
    reduceOne(result, values[idx]);
  }

  return result;
}

function performActuaMapReduce(collection, entry, callback) {
  collection.mapReduce(map, reduce, {
    out : { "reduce" : entry.out },
    query : { _mapReduced : "pending" },
    scope : { entry : {
        interval : entry.interval,
        groupBy : entry.groupBy,
        keys : entry.keys
      }
    }
  }, function (err, collection) {
    callback(err, collection);
  });
}

function copy(dict) {
  var duplicate = {};
  for (key in dict) {
    duplicate[key] = dict[key];
  }
  return duplicate;
}

function updateAddMapReducedDone(collection, callback) {
  collection.update({ _mapReduced : "pending" }, { $set : { _mapReduced : "done" } }, { multi : true, safe : true }, callback);
}

function updateAddMapReducedPending(collection, _qualifier, callback) {
  var qualifier = copy(_qualifier) || {};
  qualifier._mapReduced = { $exists: false };
  collection.update(qualifier, { $set : { _mapReduced : "pending" } }, { multi : true, safe : true }, callback);
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
        updateAddMapReducedDone(collection, function(err) {
          if (callback) {
            callback(err);
          }
        });
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
  if (running) {
    if (callback) {
      callback(err);
    }
    return;
  }
  running = true;
  loader.mapReduce(function(err){
    if (callback) {
      callback(err);
    }
    process.exit(0);
  });
});
