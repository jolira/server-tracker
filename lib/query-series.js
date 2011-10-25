var _ = require("underscore");

/**
 * The reducer is stringified & executed inside the mongo database.
 * It is important not to use any outside depedencies in this method.
 */
function reducer(obj, result) {
    function count(buckets, bucketNo) {
        if (!buckets.count) {
            buckets.count = [];
        }

        if (!buckets.count[bucketNo]) {
            buckets.count[bucketNo] = 1;
        }
        else {
            buckets.count[bucketNo] ++;
        }
    }

    function average(buckets, bucketNo, value) {
        if (!buckets.avg) {
            buckets.avg = [];
        }
        if (!buckets.avg[bucketNo]) {
            buckets.avg[bucketNo] = value;
        }
        else {
            var count = buckets.count[bucketNo];
            average[bucketNo] = (((count-1) * average[bucketNo]) + value) / count;
        }
    }

    function minimum(buckets, bucketNo, value) {
        if (!buckets.min) {
            buckets.min = [];
        }
        if (!buckets.min[bucketNo]) {
            buckets.min[bucketNo] = value;
        }
        else {
            if (buckets.min[bucketNo] > value) {
                buckets.min[bucketNo] = value;
            }
        }
    }

    function maximum(buckets, bucketNo, value) {
        if (!buckets.max) {
            buckets.max = [];
        }
        if (!buckets.max[bucketNo]) {
            buckets.max[bucketNo] = value;
        }
        else {
            if (buckets.max[bucketNo] < value) {
                buckets.max[bucketNo] = value;
            }
        }
    }

    function get(obj, accessor) {
        accessor = accessor.split('.');
        for(var idx in accessor) {
            var segment = accessor[idx];
            obj = obj[segment];

            if (!obj) {
                return undefined;
            }
        }
        return obj;
    }

    function calculate(name, accessor, obj, bucketNo, result) {
        var value = get(obj, accessor);

        if (!value) {
            return;
        }

        if (!result.stats[name]) {
            result.stats[name] = {};
        }

        var buckets = result.stats[name];
        count(buckets, bucketNo);
        average(buckets, bucketNo, value);
        minimum(buckets, bucketNo, value);
        maximum(buckets, bucketNo, value);
    }

    var bucketNo = Math.floor((obj.timestamp - result.start) / result.interval);

    for(var key in result.keys) {
        var accessor = result.keys[key];

        calculate(key, accessor, obj, bucketNo, result);
    }
}

function getMongoQualifier(req) {
  var qualifier = {
    timestamp : {
      "$gte": req.start,
      "$lte": req.end
    }
  };

  if (req.qualifier) {
    _.each(req.qualifier, function(value, key) {
      qualifier[key] = value;
    });
  }

  return qualifier;
}

function group(collection, req, callback) {
    var qualfier = getMongoQualifier(req);

    collection.group (req.groupBy, qualfier, {
        start : req.start,
        keys : req.keys,
        stats : {},
        interval : Math.floor((req.end - req.start) / req.count),
      }, reducer, true, function(err, doc) {
        if (err) {
          callback({ "error": err });
        }
        else {
          callback(doc ? doc : {"error" : "query failed"});
        }
    });
}

module.exports = function(db, req, callback) {
  req.count = parseInt(req.count);
  req.start = parseInt(req.start);
  req.end = parseInt(req.end);

  db.collection(req.collection, function(error, collection) {
    if (error) {
      callback({ "error": error });
      return;
    }

    group(collection, req, function(stats) {
        callback(stats);
    });
  });
};
