var _ = require('underscore');
var openDB = require('./db');
var db;

process.on("config", function(config, callback) {
  openDB(config.mongo, function(_db) {
    db = _db;
    callback();
  });
});

function calculate(measurement, bucketNo, result, helper, series) {
    for(var key in series) {
    }
}

function getBucketFunction(body) {
    var duration = body.end - body.start;
    var bucketLength = duration/body.count;

    return function(timestamp) {
        return (timestamp - body.start) / bucketLength;
    }
}

function getMongoQualifier(body) {
    var qualifier = body.qualifier || {};

    qualifier.timestamp = {
        "$gte": body.start,
        "$lte" : body.end
    };

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
      var helper = {};
      var getBucket = getBucketFunction(body);

      cursor.each(function(err, doc) {
        if (error) {
            result.error = error;
            callback(result);
            return;
        }

        if (!doc) {
            return;
        }

        var bucketNo = getBucket(doc.timestamp);

        calculate(doc, bucketNo, result, helper, body.series);
      })
      callback(result);
    });
  });
}

process.on("message", function(body, callback) {
    query(body, callback);
});
