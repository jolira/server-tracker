var _ = require('underscore');
var util = require('util');

function reportFailure(error, docs) {
  console.error("%s while processing %s", error, util.inspect(docs, false, 9));
}

function normalizeEvent(normalized, event, remoteAddress, submitTimestamp, source, timestamp) {
  if (submitTimestamp) {
    event.submitTimestamp = submitTimestamp;
  }
  if (!event.source && source) {
    event.source = source;
  }
  var metrics = event.metrics;
  delete event.metrics;
  if (!metrics) {
    return;
  }
  _.each(metrics, function(_metrics, type) {
    if (!_.isArray(_metrics)) {
      _metrics = [_metrics];
    }
    _.each(_metrics, function(metric) {
      var record = {
        "type": type,
        "remoteAddress": remoteAddress,
        "timestamp": timestamp,
        "event": event,
        "metric": metric
      };
      normalized.push(record);
    });
  });
  normalized.push({
    "type": "event",
    "remoteAddress": remoteAddress,
    "timestamp": timestamp,
    "event": event
  });
}

function insertEvents(
db, events, remoteAddress, submitTimestamp, source, timestamp) {
  if (!events) {
    return;
  }
  if (!_.isArray(events)) {
    events = [events];
  }
  var normalized = [];
  _.each(events, function(event) {
    normalizeEvent(normalized, event, remoteAddress, submitTimestamp, source, timestamp);
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

function insertLogs(db, logs, hostname, remoteAddress, submitTimestamp, source, timestamp) {
  if (!logs) {
    return;
  }
  if (!_.isArray(logs)) {
    logs = [logs];
  }
  var normalized = [];
  _.each(logs, function(log, idx) {
    var record = {
      "timestamp": timestamp,
      "remoteAddress": remoteAddress,
      "hostname": hostname,
      "log": log
    };
    if (submitTimestamp) {
      record.submitTimestamp = submitTimestamp;
    }
    if (!log.source && source) {
      record.source = source;
    }
    normalized[idx] = record;
  });
  db.collection('logs', function(error, collection) {
    if (error) {
      console.error(error);
      return;
    }
    _.each(logs, function(log, idx) {});
    collection.insert(normalized);
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
  var submitTimestamp = body.timestamp;
  var source = body.source;
  var date = new Date();
  var timestamp = date.getTime();
  insertEvents(this.db, body.events, remoteAddress, submitTimestamp, source, timestamp);
  insertLogs(this.db, body.logs, remoteAddress, submitTimestamp, source, timestamp);
};
module.exports = MetricServer;
