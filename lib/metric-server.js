var backgrounder = require('backgrounder');
var _ = require('underscore');

function submitPending(server) {
  if (server.pending.length) {
    server.loader.send(server.pending);
    server.pending = [];
  }
}

function MetricServer(config) {
  this.loader = backgrounder.spawn(__dirname + "/metric-loader.js");

  this.loader.on("idle", function(message) {
    submitPending();
  });
  this.loader.config(config);
  this.pending = [];
}

MetricServer.prototype.stop = function() {
    this.loader.terminate();
}

MetricServer.prototype.postMetric = function(req, res) {
  var timestamp = currentTime();
  var body = req.body;
  var client = req.client;
  var remoteAddress = client.remoteAddress;

  this.pending.push({
    "body" : body,
    "remoteAddress" : remoteAddress,
    "timestamp" : timestamp
  });

  if (!loader.pending) {
    submitPending(this);
  }

  var response = {
    "type" : "metric-server",
    "eventType" : "server-tracker",
    "timestamp" : timestamp,
    "pending" : pending.length
  };

  this.pending.push(response);
  res.send(response);

  var processed = currentTime();
  response.processingTime = processed - timestamp;
};
module.exports = MetricServer;