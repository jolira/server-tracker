var _ = require('underscore');
var util = require('util');

function reportFailure(error, docs) {
  console.error("%s while processing %s", error, util.inspect(docs, false, 9));
}

function normalizeEvent(normalized, event, remoteAddress, timestamp) {
  var metrics = event.metrics;
  delete event.metrics;
  if (metrics) {
    _.each(metrics, function(_metrics, type) {
      if (!_.isArray(_metrics)) {
        _metrics = [_metrics];
      }
      _.each(_metrics, function(metric){
        normalized.push({
          "type": type,
          "remoteAddress": remoteAddress,
          "timestamp": timestamp,
          "event": event,
          "metric": metric
        });
      })
    });
  }
  normalized.push({
    "type": "event",
    "remoteAddress": remoteAddress,
    "timestamp": timestamp,
    "event": event
  });
}

function insertEvents(db, events, remoteAddress, timestamp) {
  if (!events) {
    return;
  }
  if (!_.isArray(events)) {
    events = [events];
  }
  var normalized = [];
  _.each(events, function(event) {
    normalizeEvent(normalized, event, remoteAddress, timestamp);
  });
  db.collection('metrics', function(error, collection) {
    if (error) {
      reportFailure(error, normalized);
      return;
    }
    collection.insert(normalized, function(error, docs) {
      if (error) {
        reportFailure(error, normalized);
      }
    });
  });
}

function insertLogs(db, logs, hostname, remoteAddress, timestamp) {
  if (!logs) {
    return;
  }
  if (!_.isArray(logs)) {
    logs = [logs];
  }
  db.collection('logs', function(error, collection) {
    if (error) {
      console.error(error);
      return;
    }
    for (var idx in logs) {
      var log = logs[idx];
      collection.insert({
        "timestamp": timestamp,
        "remoteAddress": remoteAddress,
        "hostname": hostname,
        "log": log
      });
    }
  });
}

function MetricServer(db) {
  this.db = db;
}
MetricServer.prototype.postMetric = function(req, res) {
  res.send(true); // send a response first
  var body = req.body;
  var client = req.client;
  var remoteAddress = client.remoteAddress;
  var date = new Date();
  var timestamp = date.getTime();
  insertEvents(this.db, body.events, remoteAddress, timestamp);
  insertLogs(this.db, body.logs, remoteAddress, timestamp);
};
module.exports = MetricServer;