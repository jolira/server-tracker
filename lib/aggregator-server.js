var openDB = require('./db');
var _ = require('underscore');

function Aggregator(config, peer) {
  this.config = config;
  this.peer = peer;
}

Aggregator.prototype.start = function(callback) {
  var aggregator = this.config.aggregator;

  if (!aggregator) {
    return callback();
  }
  if (_.isArray(aggregator)) {
    aggregator = [ aggregator ];
  }


}

Aggregator.prototype.stop = function(callback) {
    var self = this;
    _.each(self.ids, function(id){
        clearInterval(id);
    });
    if (self.collection) {
        self.collection.close(function() {
            delete self.collection;
            if (callback) {
                callback();
            }
        });
    }
}

module.exports.start = function(config, peer, callback) {
  var scrapper = new Aggregator(config, peer);
  scrapper.start(function(svr) {
    if (callback) {
      callback(svr);
    }
  });
  return scrapper;
};
