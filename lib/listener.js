var hostname = require('os').hostname();
var config = require('./config');
var aggregator = require('./aggregator-server');
var jmxScrapper = require('./jmx-server');
var metric = require('./metric-server');
var query = require('./query-server');
var Server = require('./express-server');
var backgrounder = require('backgrounder');
var scrapper = require('./jmx-server');
var peer = require('./peer');
var timestamp = Date.now();

function startAgreggator(tracker, options, callback) {
  aggregator.start(options, tracker.services.peer, function(server) {
    tracker.services.scrapper = server;
    callback();
  });
}

function startJmxScrapper(tracker, options, callback) {
  scrapper.start(options, tracker.services.peer, function(server) {
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

function startPeer(tracker, options, callback) {
  peer.start('/peer', options.seeds, tracker.id, function(server) {
    tracker.services.peer = server;
    tracker.server.post('/peer', function(req, res) {
      server.postStatus(req, res);
    });
    callback();
  });
}

function startServices(tracker, options, callback) {
  tracker.services = {};
  startMetricServices(tracker, options, function() {
    startQueryServices(tracker, options, function() {
      startPeer(tracker, options, function() {
        startJmxScrapper(tracker, options, function(){
          startAgreggator(tracker, options, callback);
        });
      });
    });
  });
}

function stopServices(services) {
  if (!services) {
    return;
  }
  if (services.query) {
    services.query.stop();
  }
  if (services.metric) {
    services.metric.stop();
  }
  if (services.peer) {
    services.peer.stop();
  }
  if (services.scrapper) {
    services.scrapper.stop();
  }
}

function listen(count, port, self.server) {
  if (count) {
    for(var idx=0; idx<count; idx++) {
      self.server.listen(port);
    }
  }
  else {
    server.listen(port);
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
ServerTracker.prototype.start = function(callback) {
  if (this.server) {
    throw new Error("already running");
  }
  var self = this;
  self.server = new Server();
  var options = self.options.listener || {};
  var port = options.port || 3080;
  var count = options.count;
  self.id = hostname + ':' + port;
  startServices(self, self.options, function() {
    listen(count, port, self.server);
    callback(self.server);
  });
};
module.exports.start = function(config, callback) {
  var tracker = new ServerTracker(config);
  tracker.start(function(tracker) {
    if (callback) {
      callback();
    }
  });
};
