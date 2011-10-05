var _ = require('underscore');
var openDB = require('./db');
var db;

process.on("config", function(config, callback) {
  openDB(config.mongo, function(_db) {
    db = _db;
    callback();
  });
});

function getMongoQualifier(body) {
    var qualifier = body.qualifier || {};

    console.log("body:", body);

    qualifier.timestamp = {
        "$gte": body.start,
        "$lte" : body.end
    };

    console.log("qualifier:", qualifier);

    return qualifier;
}

function query(body, callback) {
    db.collection('measurements', function(error, collection) {
      if (error) {
        callback({"error" : error});
        return;
      }

    var qualifier = getMongoQualifier(body);

    collection.find(qualifier, function(error, cursor) {
      if (error) {
        callback({"error" : error});
        return;
      }

      var result = {};

      cursor.each(function(err, doc) {
        if (error) {
            result.error = error;
            callback(result);
            return;
        }

        if (!doc) {
            return;
        }

      })
      callback(result);
    });
  });
}

process.on("message", function(body, callback) {
    query(body, callback);
});
