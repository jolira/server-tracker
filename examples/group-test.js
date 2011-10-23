var config = require('../lib/config');
var opendb = require('../lib/db');

function reducer(obj, result) {
    function count(buckets, bucketNo) {
        if (!buckets.count) {
            buckets.count = [];
        }

        if (!buckets.count[bucketNo]) {
            buckets.count[bucketNo] = bucketNo;
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

    var timestamp = obj.timestamp;
    var bucketNo = Math.floor((timestamp - result.start) / result.bucketSize);

    if (!result.stats["HeapMemoryUsage"]) {
        result.stats["HeapMemoryUsage"] = {};
    }

    var buckets = result.stats["HeapMemoryUsage"];
    var value = obj.value.HeapMemoryUsage.used;

    count(buckets, bucketNo);
    average(buckets, bucketNo, value);
    minimum(buckets, bucketNo, value);
    maximum(buckets, bucketNo, value);
}

function group(collection, callback) {
    var end = Date.now();
    var start = end - 15 * 60 * 1000;
    var buckets = 5;
    collection.group ({"url.host":1},
        {timestamp: { "$gte" : start, "$lte" : end }, mbean : "java.lang:type=Memory"}, {
            start : start,
            end : end,
            stats : {},
            bucketSize : Math.floor((end - start) / buckets),
        },
        reducer,
        true,
        function(err, doc) {
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
