var backgrounder = require('backgrounder');
var _ = require('underscore');

function MapReducer(mongo, entry) {
  this.mongo = mongo;
  this.entry = entry;

}
MapReducer.prototype.start = function() {
  var self = this;
  backgrounder.spawn(__dirname + "/aggregator-loader.js", {
    "auto-restart" : true,
    "mongo": mongo,
    "entry": entry
  }, function(process) {
    self.process = process;
    var interval = entry.interval || 15000;
    self.id = setInterval(function() {
      process.send({});
    }, interval);
  });
}
MapReducer.prototype.stop = function() {
    if (this.id) {
      clearInterval(this.id);
      delete this.id;
    }
    if (this.process) {
      this.process.terminate();
      delete this.process;
    }
}
function Aggregator(config, peer) {
  this.mapreducers = [];
  this.config = config;
  this.peer = peer;
}
Aggregator.prototype.start = function(callback) {
  var self = this;
  var aggregator = self.config.aggregator;
  if (aggregator) {
    _.each(aggregator, function(entry) {
      var reducer = new MapReducer(self.config.mongo, entry);

      self.mapreducers.push(reducer);
    });
  }
  callback(this);
};
Aggregator.prototype.stop = function(callback) {
  _.each(this.mapreducers, function(process) {
    process.stop();
  });
  this.ids = [];
  callback();
};
module.exports.start = function(config, peer, callback) {
  var scrapper = new Aggregator(config, peer);
  scrapper.start(function(svr) {
    if (callback) {
      callback(svr);
    }
  });
  return scrapper;
};