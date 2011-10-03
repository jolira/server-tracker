var hostname = require('os').hostname();
var backgrounder = require('backgrounder');
var _ = require('underscore');

function MetricServer(config) {
  this.config = config;
}

MetricServer.prototype.start = function(callback) {
  if (this.loader) {
    throw new Error("already started");
  }

  var self = this;
  self.pending = 0;

  self.loader = backgrounder.spawn(__dirname + "/metric-loader.js", self.config, function(){
    callback(self);
  });
};

MetricServer.prototype.stop = function() {
  if (!this.loader) {
    throw new Error("not started");
  }

  this.loader.terminate();
  delete this.loader;
};

function send(server, message) {
    server.pending ++;
    server.loader.send(message, function() {
        -- server.pending;
    });
}

MetricServer.prototype.postMeasurement = function(req, res) {
  var self = this;
  var timestamp = Date.now();
  var body = req.body;
  var client = req.client;
  var remoteAddress = client.remoteAddress;

  send(self, {
    "body": body,
    "remoteAddress": remoteAddress,
    "timestamp": timestamp
  });
  var response = {
    "type": "metric-server",
    "eventType": "server-tracker",
    "timestamp": timestamp,
    "hostname" : hostname,
    "pending": self.pending
  };
  res.send(response);
  response.duration = Date.now() - timestamp;
  send(self, response);
};
module.exports.start = function(config, callback) {
    var server = new MetricServer(config);

    server.start(function(svr){
        if (callback) {
            callback(svr);
        }
    });

    return server;
};
