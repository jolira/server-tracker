var hostname = require('os').hostname();
var jmxScrapper = require('./jmx-scrapper');
var metric = require('./metric-server');
var query = require('./query-server');
var config = require('./config');
var Server = require('./express-server');
var backgrounder = require('backgrounder');
var timestamp = Date.now();

function startServices(tracker, options) {
  tracker.services = {
    // jmx : jmxScrapper.start(options);
  };

  query.start(options, function(server) {
    tracker.services.query = server;
    tracker.server.post('/query', function(req, res) {
        server.postQuery(req, res);
    });
  });
  metric.start(options, function(server) {
    tracker.services.metric = server;
    tracker.server.post('/submit/events', function(req, res) {
        server.postMeasurement(req, res);
    });
  });

  tracker.server.get('/tracker', function(req, res) {
    tracker.getStatus(req, res);
  });
}

function stopServices(services) {
  services.query.stop();
  services.metric.stop();
  // jmxScrapper.stop(services);
}

function ServerTracker(options) {
  if (!options.mongo) {
    options.mongo = {};
  }

  this.options = options;
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
  if (this.server) {
    throw new Error("already running");
  }

  var self = this;
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
  var tracker = new ServerTracker(options);

  tracker.start();

  return tracker;
};
