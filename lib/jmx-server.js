var backgrounder = require('backgrounder');
var _ = require('underscore');

function scan(config) {
  return backgrounder.spawn(__dirname + "/jmx-loader.js", {
    "config": config
  });
}

function JmxScrapper(config, peer) {
  this.config = config;
  this.peer = peer;
  self.ids = [];
}
JmxScrapper.prototype.start = function(callback) {
  var self = this;
  var jmx = self.config.jmx;
  if (jmx) {
    _.each(jmx, function(entry) {
      var interval = entry.interval ? entry.interval : 15000;
      var id = setInterval(function() {
        self.peer.check(function(flag) {
          if (flag) {
            scan(self.config);
          }
        });
      }, interval);
      ids.push(id);
    });
  }
  callback(this);
};
JmxScrapper.prototype.stop = function(callback) {
  _.each(this.ids, function(id) {
    clearInterval(id);
  });
  this.ids = [];
  callback();
};
module.exports.start = function(config, peer, callback) {
  var scrapper = new JmxScrapper(config, peer);
  scrapper.start(function(svr) {
    if (callback) {
      callback(svr);
    }
  });
  return scrapper;
};