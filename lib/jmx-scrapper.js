var _ = require("underscore");
var jolokia = require("jolokia-client");
var openDB = require('./db');
var url = require('url');

function report(collection, _url, mbeans, response) {
  var records = [];
  for (var idx in response) {
    var result = response[idx];
    var status = result.status;
    var bean = mbeans[idx];
    if (status !== 200) {
      console.error("failed to read mbeans %s from %s: %j", bean, _url, result);
      return;
    }
    var date = new Date();
    var timestamp = date.getTime();
    var responseTimestamp = result.timestamp * 1000;
    var value = result.value;
    records.push({
      "type" : "jmx",
      "timestamp": responseTimestamp,
      "url": url.parse(_url, true),
      "mbean": bean,
      "value": value
    });
  }
  collection.insert(records, function(err) {
    if (err) {
      console.error("failed to insert %j, because of %s", records, err);
    }
  });
}

function scan(collection, url, entry) {
    var mbeans = entry.mbeans;
    if (!_.isArray(mbeans)) {
      mbeans = [mbeans];
    }
    var client = new jolokia(url);
    client.read(mbeans, function(response) {
      if (response) {
        report(collection, url, mbeans, response);
      }
    });
}

function scrape(collection, url, master, entry) {
  var interval = entry.interval ? entry.interval : 15000;
  return setInterval(function() {
    master.isMaster(function(flag){
      if (flag) {
        scan(collection, url, entry);
      }
    });
  }, interval);
}

function JmxScrapper(config, master) {
  this.config = config;
  this.master = master;
  this.ids = [];
}

JmxScrapper.prototype.start = function(callback) {
  var self = this;
  var jmx = self.config.jmx;

  if (!jmx) {
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
            var id = scrape(collection, url, self.master, {
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

JmxScrapper.prototype.stop = function(callback) {
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

module.exports.start = function(config, master, callback) {
  var scrapper = new JmxScrapper(config, master);
  scrapper.start(function(svr) {
    if (callback) {
      callback(svr);
    }
  });
  return scrapper;
};
