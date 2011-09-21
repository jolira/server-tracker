var _ = require('underscore');

function mergeProperties(source, target) {
  _.each(source, function(value, key) {
    if (!target[key]) {
      target[key] = value;
    }
  });
}

function normalizeEvents(response, events, normalized) {
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
    var metrics = event.metrics;
    delete event.metrics;
    if (metrics) {
      _.each(metrics, function(_metrics, type) {
        if (!_.isArray(_metrics)) {
          _metrics = [_metrics];
        }
        _.each(_metrics, function(metric) {
          metricCounter++;
          var _metric = {
            "type": type,
            "values": metric
          };
          mergeProperties(event, _metric);
          normalized.push(_metric);
        });
      });
    }
    event.type = "event";
    normalized.push(event);
  });
  response.eventCount = eventCounter;
  response.metricCount = metricCounter;
}

function normalizeLogs(response, logs, normalized) {
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
  response.logCount = counter;
}

function MetricServer(db) {
  this.db = db;
  this.pending = [];
}

function currentTime() {
  var date = new Date();
  return date.getTime();
}
MetricServer.prototype.postMetric = function(req, res) {
  var response = {};
  var body = req.body;
  var client = req.client;
  var timestamp = currentTime();
  var events = body.events;
  var logs = body.logs;
  delete body.logs;
  delete body.events;
  delete client.remoteAddress;
  delete body.timestamp;
  var normalized = [];
  response.timestamp = timestamp;
  normalizeEvents(response, events, normalized);
  normalizeLogs(response, logs, normalized);
  _.each(normalized, function(metric) {
    metric.remoteAddress = client.remoteAddress;
    metric.submitTimestamp = body.timestamp;
    metric.receiveTimestamp = timestamp;
    mergeProperties(body, metric);
  });
  this.db.collection('metrics', function(error, collection) {
    if (error) {
      throw error;
    }
    _.each(this.pending, function(event) {
      normalized.push(event);
    });
    this.pending.length = 0;
    collection.insert(normalized, function(error) {
      if (error) {
        throw error;
      }
      var inserted = currentTime();
      response.duration = inserted - timestamp;
      response.type = "server-tracker";
      this.pending.push(response);
    });
  });
  var processed = currentTime();
  response.processingTime = processed - timestamp;
  res.send(response);
};
module.exports = MetricServer;