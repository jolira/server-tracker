var _ = require("underscore");
var jolokia = require("jolokia-client");
var openDB = require('./db');
var url = require('url');

function report(collection, _url, mbeans, response, callback) {
  var records = [];
  for (var idx in response) {
    var result = response[idx];
    var status = result.status;
    var bean = mbeans[idx];
    if (status !== 200) {
      console.error("failed to read mbeans %s from %s: %j", bean, _url, result);
      callback();
      return;
    }
    var date = new Date();
    var timestamp = date.getTime();
    var responseTimestamp = result.timestamp * 1000;
    var value = result.value;
    var purl = url.parse(_url, false);
    var surl = {
        "host" : purl.host,
        "port" : purl.port
    };
    if (purl.port) {
        surl.port = purl.port;
    }
    records.push({
      "timestamp": responseTimestamp,
      "url": surl,
      "mbean": bean,
      "value": value
    });
  }
  collection.insert(records, function(err) {
    if (err) {
      console.error("failed to insert %j, because of %s", records, err);
    }
    callback();
  });
}

function scrape(collection, url, entry, callback) {
    var mbeans = entry.mbeans;
    if (!_.isArray(mbeans)) {
      mbeans = [mbeans];
    }
    var client = new jolokia(url);
    client.read(mbeans, function(response) {
      if (response) {
        report(collection, url, mbeans, response, callback);
      }
      else {
        callback();
      }
    });
}

process.on("config", function(cfg) {
  var config = cfg.config;
  var counter = 0;
  openDB(config.mongo, function(db) {
    db.collection('jmx', function(error, collection) {
      _.each(config.jmx, function(entry) {
        _.each(entry.targets, function(url) {
            counter ++;
            scrape(collection, url, {
              "interval": entry.interval,
              "mbeans": entry.mbeans
            }, function() {
                if (--counter === 0) {
                    process.exit(0);
                }
            });
        });
      });
    });
  });
});
