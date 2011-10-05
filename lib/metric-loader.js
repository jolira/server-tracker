var hostname = require('os').hostname();
var _ = require('underscore');
var openDB = require('./db');
var pending = [];
var db;

process.on("config", function(config, callback) {
  openDB(config.mongo, function(_db) {
    db = _db;
    callback();
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
  var measurementCounter = 0;
  if (!_.isArray(events)) {
    events = [events];
  }
  _.each(events, function(event) {
    eventCounter++;
    var eventType = event.type;
    var measurements = event.measurements;

    if (!measurements) {
        measurements = event.metrics;
    }

    delete event.metrics;
    delete event.measurements;
    delete event.type;

    if (measurements) {
      _.each(measurements, function(_measurements, type) {
        if (!_.isArray(_measurements)) {
          _measurements = [_measurements];
        }
        _.each(_measurements, function(measurement) {
          measurementCounter++;
          if (eventType) {
            measurement.eventType = eventType;
          }
          mergeProperties(event, measurement);
          measurement.type = type;
          normalized.push(measurement);
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
  event.measurementCount = measurementCounter;
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

function insertIfStillPending() {
  if (!pending.length) {
    return;
  }

  db.collection('measurements', function(error, collection) {
    if (error) {
      throw error;
    }

    collection.insert(pending, function(error) {
      if (error) {
        throw error;
      }

      pending = [];
    });
  });
}

function pushMeasurement(message) {
    pending.push(message);

    if (pending.length === 1) {
      setTimeout(function () {
        insertIfStillPending();
      }, 2500);
    }
}

function postMeasurement(receiveTimestamp, body, remoteAddress, callback) {
  var timestamp = Date.now();
  var submitTimestamp = body.timestamp;
  var events = body.events;
  var logs = body.logs;

  delete body.logs;
  delete body.events;
  delete body.timestamp;

  var normalized = [];
  var event = {
    "timestamp": timestamp,
    "hostname" : hostname,
    "queuing" : timestamp - receiveTimestamp
  };

  if (submitTimestamp) {
    event.transmitting = receiveTimestamp - submitTimestamp;
  }

  normalizeEvents(event, events, normalized);
  normalizeLogs(event, logs, normalized);

  _.each(normalized, function(measurement) {
    mergeProperties(body, measurement);
  });
  _.each(pending, function(event) {
    normalized.push(event);
  });
  pending = [];

  db.collection('measurements', function(error, collection) {
    if (error) {
      throw error;
    }

    collection.insert(normalized, function(error) {
      if (error) {
        throw error;
      }
      event.type = "measurement-loader";
      event.eventType = "server-tracker";
      event.duration = Date.now() - timestamp;
      pushMeasurement(event);

      if (callback) {
        callback();
      }
    });
  });
  event.processing = Date.now() - timestamp;
}

process.on("message", function(message, callback) {
    if (message.type) {
        pushMeasurement(message);

        if (callback) {
            callback();
        }
        return;
    }
    var body = message.body;
    var remoteAddress = message.remoteAddress;
    var timestamp = message.timestamp;
    postMeasurement(timestamp, body, remoteAddress, callback);
});