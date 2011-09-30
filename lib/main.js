var jmxScrapper = require('./jmx-scrapper');
var MetricServer = require('./metric-server');
var QueryServer = require('./query-server');
var config = require('./config');
var Server = require('./express-server');
var timestamp = Date.now();

function startServices(server, options) {
  var services = {
    // jmx : jmxScrapper.start(options);
    metric: new MetricServer(options),
    query: new QueryServer(options)
  };

  // Routes
   server.post('/submit/events', function(req, res) {
    services.metric.postMeasurement(req, res);
  });
  server.post('/query', function(req, res) {
    services.query.postQuery(req, res);
  });

  return services;
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

    self.server.listen(listenPort);
    self.services = startServices(self.server, options);
  });
};

module.exports.start = function(options) {
  return new ServerTracker(options);
};
