var hostname = require('os').hostname();
var jmxScrapper = require('./jmx-scrapper');
var metric = require('./metric-server');
var query = require('./query-server');
var config = require('./config');
var Server = require('./express-server');
var backgrounder = require('backgrounder');
var timestamp = Date.now();

function startQueryServices(tracker, options, callback) {
  query.start(tracker.services.metric, options, function(server) {
    tracker.services.query = server;
    tracker.server.post('/query', function(req, res) {
      server.postQuery(req, res);
    });
    callback();
  });
}

function startMetricServices(tracker, options, callback) {
  metric.start(options, function(server) {
    tracker.services.metric = server;
    tracker.server.post('/submit/events', function(req, res) {
      server.postEvents(req, res);
    });
    callback();
  });
}

function startServices(tracker, options, callback) {
  tracker.services = {
    // jmx : jmxScrapper.start(options);
  };
  startMetricServices(tracker, options, function() {
    startQueryServices(tracker, options, callback);
  });
}

function stopServices(services) {
  if (services.query) {
    services.query.stop();
  }
  if (services.metric) {
    services.metric.stop();
  }
  // jmxScrapper.stop(services);
}

function ServerTracker(options) {
  if (!options.mongo) {
    options.mongo = {};
  }
  this.options = options;
}
ServerTracker.prototype.stop = function(callback) {
  if (!this.server) {
    throw new Error("not running");
  }
  if (this.server) {
    this.server.stop();
  }
  stopServices(this.services);
  delete this.server;
  delete this.services;
  if (callback) {
    callback();
  }
};
ServerTracker.prototype.restart = function() {
  var self = this;
  self.stop(function() {
    self.start();
  });
};
ServerTracker.prototype.start = function() {
  if (this.server) {
    throw new Error("already running");
  }
  var self = this;
  self.server = new Server();
  config.load(self.options, function(options) {
    self.options = options;
    var listenPort = process.env.C9_PORT;
    if (!listenPort) {
      listenPort = options.listenPort ? options.listenPort : 3080;
    }
    self.id = hostname + ':' + listenPort;
    startServices(self, options, function() {
      self.server.listen(listenPort);
    });
  });
};
module.exports.start = function(options) {
  var tracker = new ServerTracker(options);
  tracker.start();
  return tracker;
};