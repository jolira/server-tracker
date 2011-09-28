var _ = require('underscore');
var openDB = require('./db');
var pending = [];
var db;
process.on("config", function(config) {
  openDB(config.mongo, function(_db) {
    db = _db;
  });
});

function mergeProperties(source, target) {
  _.each(source, function(value, key) {
    if (!target[key]) {
      target[key] = value;
    }
  });
}

function normalizeEvents(event, events, normalized) {
  if (!events) {
    return;
  }
  var eventCounter = 0;
  var metricCounter = 0;
  if (!_.isArray(events)) {
    events = [events];
  }
  _.each(events, function(event) {
    eventCounter++;
    var eventType = event.type;
    var metrics = event.metrics;
    delete event.metrics;
    delete event.type;
    if (metrics) {
      _.each(metrics, function(_metrics, type) {
        if (!_.isArray(_metrics)) {
          _metrics = [_metrics];
        }
        _.each(_metrics, function(metric) {
          metricCounter++;
          if (eventType) {
            metric.eventType = eventType;
          }
          mergeProperties(event, metric);
          metric.type = type;
          normalized.push(metric);
        });
      });
    }
    event.type = "event";
    if (eventType) {
      event.eventType = eventType;
    }
    normalized.push(event);
  });
  event.eventCount = eventCounter;
  event.metricCount = metricCounter;
}

function normalizeLogs(event, logs, normalized) {
  if (!logs) {
    return;
  }
  var counter = 0;
  if (!_.isArray(logs)) {
    logs = [logs];
  }
  _.each(logs, function(log) {
    counter++;
    log.type = "log-record";
    normalized.push(log);
  });
  event.logCount = counter;
}

function currentTime() {
  var date = new Date();
  return date.getTime();
}

function postMetric(receiveTimestamp, body, remoteAddress) {
  var timestamp = currentTime();
  var submitTimestamp = body.timestamp;
  var events = body.events;
  var logs = body.logs;
  delete body.logs;
  delete body.events;
  delete client.remoteAddress;
  delete body.timestamp;
  var normalized = [];
  var event = {
    "timestamp": timestamp
  };
  normalizeEvents(event, events, normalized);
  normalizeLogs(event, logs, normalized);
  _.each(normalized, function(metric) {
    metric.remoteAddress = remoteAddress;
    metric.receiveTimestamp = receiveTimestamp;
    metric.processTimestamp = timestamp;
    if (submitTimestamp) {
      metric.submitTimestamp = submitTimestamp;
    }
    mergeProperties(body, metric);
  });
  db.collection('metrics', function(error, collection) {
    if (error) {
      throw error;
    }
    _.each(pending, function(event) {
      normalized.push(event);
    });
    pending = [];
    collection.insert(normalized, function(error) {
      if (error) {
        throw error;
      }
      var inserted = currentTime();
      event.duration = inserted - timestamp;
      event.type = "metric-server";
      event.eventType = "server-tracker";
      pending.push(event);
    });
  });
  var processed = currentTime();
  event.processingTime = processed - timestamp;
  res.send(event);
}
process.on("message", function(message) {
  if (message.type) {
    pending.push(message);
    return;
  }
  var body = message.body;
  var remoteAddress = message.remoteAddress;
  var timestamp = message.timestamp;
  postMetric(timestamp, body, remoteAddress);
});