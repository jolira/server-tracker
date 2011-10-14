var backgrounder = require('backgrounder');
var config = require('./config');

function ServerLauncher(options) {
  this.options = options;
}
ServerLauncher.prototype.start = function(config) {
  if (this.server) {
    throw new Error("already running");
  }
  var dispatcherConfig = config.dispatcher || {};
  var listenPorts = dispatcherConfig.listenPorts || [ 3080 ];
  var self = this;
  self.server = backgrounder.spawn(__dirname + "/dispatcher.js", {
    "mongo": config.mongo,
    "children-count": listenPorts.length,
    "auto-restart": true,
    "config" : config
  }, function() {
    // callback(self);
  });
};
ServerLauncher.prototype.stop = function() {
    if (this.server) {
        this.server.terminate();
    }
}

module.exports.start = function(options) {
  var queryOnly = options["query-only"];
  if (!options.mongo) {
    options.mongo = {};
  }
  var launcher = new ServerLauncher();
  config.load(options, function(options) {
      options["query-only"] = queryOnly;
      console.log("options: %j", options);
      launcher.start(options);
  });
  return launcher;
};
