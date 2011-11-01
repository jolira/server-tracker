var config = require('../lib/config');
var opendb = require('../lib/db');

function map() {
  var timestamp = this.timestamp;
  var minute = this.timestamp / 60000;
  var host = this.url.host;
  var value = {};

  value[host] = {
    "heapUsed" : {
        "min" : this.value.HeapMemoryUsage.used,
        "max" : this.value.HeapMemoryUsage.used,
        "sum" : this.value.HeapMemoryUsage.used,
        "avg" : this.value.HeapMemoryUsage.used,
        "count" : 1
    }
  };

  emit(minute * 60000, value);
  db.jmx.update({_id : this._id}, { $set : { _mapReduced : true } });
}

function reduce(key, values) {
    var _reduced = {};

    values.forEach(function(_entry) {
        for (host in _entry) {
            var entry = _entry[host];
            var reduced = _reduced[host];

            if (!reduced) {
                return _reduced[host] = entry;
            }

            reduced.heapUsed.min = entry.heapUsed.min < reduced.heapUsed.min ? entry.heapUsed.min : reduced.heapUsed.min;
            reduced.heapUsed.max = entry.heapUsed.max > reduced.heapUsed.max ? entry.heapUsed.max : reduced.heapUsed.max;
            reduced.heapUsed.sum = entry.heapUsed.sum + reduced.heapUsed.sum;
            reduced.heapUsed.count = entry.heapUsed.count + reduced.heapUsed.count;
            reduced.heapUsed.avg = reduced.heapUsed.sum / reduced.heapUsed.count;
        };
    });

    return _reduced;
}

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
        mapReduce(collection, function(){
          db.close();
        });
      });
    });
  });
};

config.bootstrap(function(options){
  start(options);
});
