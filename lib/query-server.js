var hostname = require('os').hostname();
var backgrounder = require('backgrounder');
var _ = require('underscore');

function QueryServer(metric, config) {
  this.metric = metric;
  this.config = config;
}

QueryServer.prototype.start = function(callback) {
  if (this.loader) {
    throw new Error("already started");
  }

  var self = this;
  self.pending = 0;

  self.loader = backgrounder.spawn(__dirname + "/query-loader.js", {
    "mongo" : self.config.mongo,
    "children-count" : self.config["query-children-count"]
  }, function(){
    callback(self);
  });
};

QueryServer.prototype.stop = function() {
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

QueryServer.prototype.postQuery = function(req, res) {
  var timestamp = Date.now();
  var body = req.body;
  var remoteAddress = req.client.remoteAddress;
  var self = this;

  var response = {
    "type": "metric-server",
    "eventType": "server-tracker",
    "timestamp": timestamp,
    "hostname" : hostname,
    "pending": self.pending
  };
  send(self, {
    "body": body,
    "remoteAddress": remoteAddress,
    "timestamp": timestamp
  }, function(response) {
      res.send(response);
      response.duration = Date.now() - timestamp;
      send(self, response);
      this.metric.postMeasurement(response);
  });
  response.submitDuration = Date.now() - timestamp;
};
module.exports.start = function(metric, config, callback) {
    var server = new QueryServer(metric, config);

    server.start(function(svr){
        if (callback) {
            callback(svr);
        }
    });

    return server;
};
