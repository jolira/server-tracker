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
      collection : "jmx",
      interval : 60000,
      out : "jmx-stats",
      groupBy: { "url.host" : 1 },
      keys: { "heap used" : "value.HeapMemoryUsage.used" }
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
