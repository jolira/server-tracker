var config = require('../lib/config');
var opendb = require('../lib/db');

function reducer(obj, result) {
  function count(buckets, bucketNo) {
    if (!buckets.count) {
      buckets.count = [];
    }
    if (!buckets.count[bucketNo]) {
      buckets.count[bucketNo] = 1;
    }
    else {
      buckets.count[bucketNo]++;
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
      average[bucketNo] = (((count - 1) * average[bucketNo]) + value) / count;
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
    for (var idx in accessor) {
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
  var bucketNo = Math.floor((obj.timestamp - result.start) / result.bucketSize);
  for (var key in result.keys) {
    var accessor = result.keys[key];
    calculate(key, accessor, obj, bucketNo, result);
  }
}

function group(collection, callback) {
  var end = Date.now();
  var start = end - 24 * 60 * 60 * 1000;
  var buckets = 24;
  collection.group({
    "url.host": 1
  }, {
    timestamp: {
      "$gte": start,
      "$lte": end
    },
    mbean: "java.lang:type=Memory"
  }, {
    start: start,
    keys: {
      "heap used": "value.HeapMemoryUsage.used"
    },
    stats: {},
    bucketSize: Math.floor((end - start) / buckets)
  }, reducer, true, function (err, doc) {
    console.log(require("util").inspect(doc, false, 100));
    callback();
  });
}

function start(options) {
  if (!options.mongo) {
    options.mongo = {};
  }
  config.load(options, function (options) {
    opendb(options.mongo, function (db) {
      db.collection("jmx", function (err, collection) {
        if (err) {
          throw err;
        }
        group(collection, function () {
          db.close();
        });
      });
    });
  });
}
config.bootstrap(function (options) {
  start(options);
});