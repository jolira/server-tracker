var backgrounder = require('backgrounder');
var _ = require('underscore');

function submitPending(server) {
  if (server.pending.length) {
    server.loader.send(server.pending);
    server.pending = [];
  }
}

function MetricServer(config) {
  var self = this;

  self.pending = [];
  self.loader = backgrounder.spawn(__dirname + "/metric-loader.js");

  self.loader.on("idle", function(message) {
    submitPending(self);
  });
  self.loader.config(config);
}

MetricServer.prototype.stop = function() {
    this.loader.terminate();
}

MetricServer.prototype.postMetric = function(req, res) {
  var self = this;
  var timestamp = currentTime();
  var body = req.body;
  var client = req.client;
  var remoteAddress = client.remoteAddress;

  self.pending.push({
    "body" : body,
    "remoteAddress" : remoteAddress,
    "timestamp" : timestamp
  });

  if (!loader.pending) {
    submitPending(self);
  }

  var response = {
    "type" : "metric-server",
    "eventType" : "server-tracker",
    "timestamp" : timestamp,
    "pending" : self.pending.length
  };

  self.pending.push(response);
  res.send(response);

  var processed = currentTime();
  response.processingTime = processed - timestamp;
};
module.exports = MetricServer;