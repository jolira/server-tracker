var config = require('../lib/config');
var opendb = require('../lib/db');

function reducer(obj, result) {
    function count(buckets, bucketNo) {
        var counts = buckets["count"];
        if (!counts) {
            counts = buckets["count"] = [];
        }
        if (!counts[bucketNo]) {
            counts[bucketNo] = 1;
        }
        else {
            counts[bucketNo] ++;
        }
    }

    function average(buckets, bucketNo, value) {
        var average = buckets["avg"];
        if (!average) {
            average = buckets["avg"] = [];
        }
        if (!average[bucketNo]) {
            average[bucketNo] = value;
        }
        else {
            var counts = buckets["count"];
            var count = counts[bucketNo];
            average[bucketNo] = (((count-1) * average[bucketNo]) + value) / count;
        }
    }

    function minimum(buckets, bucketNo, value) {
        var mins = buckets["min"];
        if (!mins) {
            mins = buckets["min"] = [];
        }
        if (!mins[bucketNo]) {
            mins[bucketNo] = value;
        }
        else {
            if (mins[bucketNo] > value) {
                mins[bucketNo] = value;
            }
        }
    }

    function maximum(buckets, bucketNo, value) {
        var maxs = buckets["max"];
        if (!maxs) {
            maxs = buckets["max"] = [];
        }
        if (!maxs[bucketNo]) {
            maxs[bucketNo] = value;
        }
        else {
            if (maxs[bucketNo] < value) {
                maxs[bucketNo] = value;
            }
        }
    }

    var timestamp = obj.timestamp;
    var value = obj.value.HeapMemoryUsage.used;
    var buckets = result.stats["HeapMemoryUsage"];

    if (!buckets) {
        buckets = result.stats["HeapMemoryUsage"] = {};
    }

    var bucketNo = (timestamp - result.start) / result.bucketSize;
    var bucket = buckets[bucketNo];

    count(buckets, bucketNo);
    average(buckets, bucketNo, value);
    minimum(buckets, bucketNo, value);
    maximum(buckets, bucketNo, value);
}

function group(collection, callback) {
    var end = Date.now();
    var start = end - 15 * 60 * 1000;
    var buckets = 15;
    collection.group ({}, {timestamp: { "$gte" : start, "$lte" : end }, mbean : "java.lang:type=Memory"}, {
        start : start,
        end : end,
        count : 0,
        stats : {},
        bucketSize : Math.floor((end - start) / buckets),

    }, reducer, true, function(err, doc) {
      console.log(require("util").inspect(doc, false, 100));
      callback();
    });
}

function start(options) {
  if (!options.mongo) {
    options.mongo = {};
  }
  config.load(options, function(options) {
    opendb(options.mongo, function(db){
      db.collection("jmx", function(err, collection){
        if (err) {
            throw new err;
        }
        group(collection, function(){
          db.close();
        });
      });
    });
  });
};

config.bootstrap(function(options){
  start(options);
});
