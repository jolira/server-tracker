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
      result : "jmx-stats"
    },
    mongo : options.mongo
  }, function() {
    emitter.emit("message", function(){
      console.log("reduced");
    });
  });
}

config.bootstrap(function (options) {
  start(options);
});
