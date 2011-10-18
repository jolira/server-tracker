var backgrounder = require('backgrounder');

function scan(config) {
  return backgrounder.spawn(__dirname + "/jmx-loader.js", {
    "config": config
  });
}

function JmxScrapper(config, peer) {
  this.config = config;
  this.peer = peer;
}

JmxScrapper.prototype.start = function(callback) {
  var self = this;
  var jmx = self.config.jmx;

  if (jmx) {
    var interval = jmx.interval ? jmx.interval : 15000;
    self.id = setInterval(function() {
      self.peer.check(function(flag){
        if (flag) {
          scan(self.config);
        }
      });
    }, interval);
  }

  callback(this);
}

JmxScrapper.prototype.stop = function(callback) {
  if (this.id) {
    clearInterval(this.id);
  }
  callback();
}

module.exports.start = function(config, peer, callback) {
  var scrapper = new JmxScrapper(config, peer);
  scrapper.start(function(svr) {
    if (callback) {
      callback(svr);
    }
  });
  return scrapper;
};