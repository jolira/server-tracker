// db.jmx.update({"_mapReduced":"done"}, {"$unset":{_mapReduced:1}}, false, true)

var events = require("events");
var config = require('../lib/config');
var emitter = new events.EventEmitter();

process.on = function(event, listener) {
  emitter.on(event, listener);
};

require("../lib/aggregator-loader.js");

function start(options) {
  emitter.emit("config", {
    entry : {
      qualifier : {},
      collection : "jmx",
      interval : 60000,
      out : "jmx-stats",
      groupBy: { "url.host" : 1 },
      keys: {
        "heap-used" : "value.HeapMemoryUsage.used",
        "heap-committed" : "value.HeapMemoryUsage.committed",
        "non-heap-used" : "value.NonHeapMemoryUsage.used",
        "non-heap-committed" : "value.NonHeapMemoryUsage.committed",
        "free-mem" : "value.FreePhysicalMemorySize",
        "free-swap" : "value.FreeSwapSpaceSize",
        "open-files" : "value.OpenFileDescriptorCount",
        "committed-mem" : "value.CommittedVirtualMemorySize",
        "current-threads" : "value.currentThreadCount",
        "busy-threads" : "value.currentThreadsBusy",
        "thread-peak" : "value.PeakThreadCount",
        "thread-count" : "value.ThreadCount",
        "load" : "value.SystemLoadAverage"
      }
    },
    mongo : options.mongo
  }, function() {
    emitter.emit("message", {}, function(){
      console.log("reduced");
    });
  });
}

config.bootstrap(function (options) {
  start(options);
});
