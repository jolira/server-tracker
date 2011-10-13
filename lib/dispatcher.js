var hostname = require('os').hostname();
var jmxScrapper = require('./jmx-scrapper');
var metric = require('./metric-server');
var query = require('./query-server');
var Server = require('./express-server');
var backgrounder = require('backgrounder');
var scrapper = require('./jmx-scrapper');
var master = require('./master');
var timestamp = Date.now();

function startJmxScrapper(tracker, options, callback) {
  scrapper.start(options, tracker.services.master, function(server) {
    tracker.services.scrapper = server;
    callback();
  });
}
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

function startMaster(tracker, options, callback) {
  master.start('/master', options.seeds, tracker.id, function(server) {
    tracker.services.master = server;
    tracker.server.post('/master', function(req, res) {
      server.postStatus(req, res);
    });
    callback();
  });
}

function startServices(tracker, options, callback) {
  tracker.services = {
    // jmx : jmxScrapper.start(options);
  };
  startMetricServices(tracker, options, function() {
    startQueryServices(tracker, options, function(){
        startMaster(tracker, options, function(){
            startJmxScrapper(tracker, options, callback);
        });
    });
  });
}

function stopServices(services) {
  if (services.query) {
    services.query.stop();
  }
  if (services.metric) {
    services.metric.stop();
  }
  if (services.master) {
    services.master.stop();
  }
  if (services.scraper) {
    services.scrapper.stop();
  }
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
  var options = this.options;
  var dispOptions = options.dispatcher || {};
  var listenPorts = dispOptions.listenPorts || [ 3080 ];
  var listenPort = listenPorts[process.id];

  self.id = hostname + ':' + listenPort;
  startServices(self, options, function() {
    self.server.listen(listenPort);
  });
};

process.on("config", function(config, callback) {
  var tracker = new ServerTracker(config.config);
  tracker.start();
  callback();
});
