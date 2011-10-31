var hostname = require('os').hostname();
var backgrounder = require('backgrounder');
var _ = require('underscore');

function QueryServer(metric, config) {
  this.metric = metric;
  this.config = config;
}
QueryServer.prototype.start = function (callback) {
  if (this.loader) {
    throw new Error("already started");
  }
  var self = this;
  self.pending = 0;
  var queryConfig = self.config.query || {};
  var childrenCount = queryConfig["children-count"] || 1;
  self.loader = backgrounder.spawn(__dirname + "/query-loader.js", {
    "children-count": childrenCount,
    "config": self.config
  }, function () {
    callback(self);
  });
};
QueryServer.prototype.stop = function () {
  if (!this.loader) {
    return;
  }
  this.loader.terminate();
  delete this.loader;
};

function send(server, message, callback) {
  server.pending++;
  server.loader.send(message, function () {
    --server.pending;
    callback.apply(null, arguments);
  });
}
QueryServer.prototype.postQuery = function (req, res) {
  var timestamp = Date.now();
  var body = req.body;
  var remoteAddress = req.client.remoteAddress;
  var self = this;
  var measurement = {
    "type": "query-server",
    "eventType": "server-tracker",
    "timestamp": timestamp,
    "hostname": hostname,
    "pending": self.pending,
    "query": JSON.stringify(body)
  };
  send(self, body, function (response) {
    res.send(response);
    measurement.duration = Date.now() - timestamp;
    self.metric.postMeasurement(measurement);
  });
  measurement.submitDuration = Date.now() - timestamp;
};
module.exports.start = function (metric, config, callback) {
  var server = new QueryServer(metric, config);
  server.start(function (svr) {
    if (callback) {
      callback(svr);
    }
  });
  return server;
};