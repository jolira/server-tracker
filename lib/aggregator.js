function Aggregator(config, peer) {
  this.config = config;
  this.peer = peer;
}

Aggregator.prototype.start = function(callback) {
  var self = this;
  var aggregator = self.config.aggregator;

  if (!aggregator) {
    return callback();
  }
  openDB(self.config.mongo, function(db) {
    db.collection('measurements', function(error, collection) {
      if (error) {
        throw error;
      }
      self.collection = collection;
      _.each(jmx, function(entry) {
        _.each(entry.targets, function(url) {
            var id = scrape(collection, url, self.peer, {
              "interval": entry.interval,
              "mbeans": entry.mbeans
            });
            self.ids.push(id);
        });
      });

      callback();
    });
  });
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
