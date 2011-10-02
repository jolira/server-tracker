var hostname = require('os').hostname();
var jmxScrapper = require('./jmx-scrapper');
var MetricServer = require('./metric-server');
var QueryServer = require('./query-server');
var config = require('./config');
var Server = require('./express-server');
var backgrounder = require('backgrounder');
var timestamp = Date.now();

function startServices(tracker, options) {
  tracker.services = {
    // jmx : jmxScrapper.start(options);
    metric: new MetricServer(options),
    query: new QueryServer(options)
  };

  tracker.server.post('/submit/events', function(req, res) {
    tracker.services.metric.postMeasurement(req, res);
  });
  tracker.server.get('/tracker', function(req, res) {
    tracker.getStatus(req, res);
  });
  tracker.server.post('/query', function(req, res) {
    tracker.services.query.postQuery(req, res);
  });


}

function stopServices(services) {
  services.metric.stop();
  // jmxScrapper.stop(services);
}

function ServerTracker(options) {
  if (!options.mongo) {
    options.mongo = {};
  }

  this.options = options;
  this.start();
}

ServerTracker.prototype.getStatus = function(req, res) {
  var self = this;

  config.load(this.options, function(options){
    res.send({
        "timestamp" : timestamp,
        "options" : options,
        "id" : self.id
    });
  });
}

ServerTracker.prototype.stop = function(callback) {
  if (!this.server) {
    throw new Error("not running");
  }

  this.server.stop();
  stopServices(this.services);

  delete this.server;
  delete this.services;

  if (callback) {
    callback();
  }
};

ServerTracker.prototype.restart = function() {
  var self = this;

  self.stop(function(){
    self.start();
  });
};

ServerTracker.prototype.start = function() {
  var self = this;

  if (self.server) {
    throw new Error("already running");
  }

  self.server = new Server();

  config.load(self.options, function(options){
    self.options = options;
    var listenPort = process.env.C9_PORT;

    if (!listenPort) {
      listenPort = options.listenPort ? options.listenPort : 3080;
    }

    self.id = hostname + ':' + listenPort;
    self.server.listen(listenPort);
    startServices(self, options);
  });
};

module.exports.start = function(options) {
  return new ServerTracker(options);
};
