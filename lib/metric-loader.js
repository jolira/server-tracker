var hostname = require('os').hostname();
var _ = require('underscore');
var openDB = require('./db');
var pending = [];
var collectionByName = {};
var counter = 0;
var restartCount;
var db;
process.on("config", function(config, callback) {
  restartCount = config["restart-count"];
  openDB(config.config.mongo, function(_db) {
    db = _db;
    callback();
  }, true); // Let it leak
});

function mergeProperties(source, target) {
  _.each(source, function(value, key) {
    if (!target[key]) {
      target[key] = value;
    }
  });
}

function addEntry(normalized, type, measurement) {
  var values = normalized[type];
  if (!values) {
    normalized[type] = values = [];
  }
  values.push(measurement);
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
          addEntry(normalized, type, measurement);
        });
      });
    }
    if (eventType) {
      event.eventType = eventType;
    }
    addEntry(normalized, "event", event);
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
    addEntry(normalized, "log-record", log);
  });
  event.logCount = counter;
}

function insertCollectedValues(collection, values) {
  collection.insert(values, function(error) {
    if (error) {
      console.error("failed to insert", error.stack);
    }
  });
}

function insertValues(name, values) {
  var collection = collectionByName[name];
  if (collection) {
    return insertCollectedValues(collection, values);
  }
  db.collection(name, function(error, collection) {
    if (error) {
      console.error("failed to open", error.stack);
    }
    else {
      collectionByName[name] = collection;
      insertCollectedValues(collection, values);
    }
  });
}

function insert(valByCollection) {
  _.each(valByCollection, function(values, name) {
    insertValues(name, values);
  });
}

function pushMeasurement(type, message) {
  addEntry(pending, type, message);
  if (pending.length === 1) {
    setTimeout(function() {
      insert(pending);
      pending = {};
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
  var normalized = {};
  var event = {
    "timestamp": timestamp,
    "hostname": hostname,
    "queuing": timestamp - receiveTimestamp
  };
  if (submitTimestamp) {
    event.transmitting = receiveTimestamp - submitTimestamp;
  }
  normalizeEvents(event, events, normalized);
  normalizeLogs(event, logs, normalized);
  _.each(normalized, function(measurements) {
    _.each(measurements, function(measurement) {
      mergeProperties(body, measurement);
    });
  });
  _.each(pending, function(event, name) {
    addEntry(normalized, name, event);
  });
  pending = {};
  insert(normalized);
  event.eventType = "server-tracker";
  event.duration = Date.now() - timestamp;
  pushMeasurement("measurement-loader", event);
  if (callback) {
    callback();
  }
  event.processing = Date.now() - timestamp;
}
process.on("message", function(message, callback) {
  counter++;
  var _callback = function() {
      if (callback) {
        callback();
      }
      if (counter >= restartCount) {
        process.exit(0); // restarting to work around a mongodb-native memory leak
      }
      };
  if (message.type) {
    var type = message.type;
    delete message.type;
    pushMeasurement(type, message);
    _callback();
    return;
  }
  var body = message.body;
  var remoteAddress = message.remoteAddress;
  var timestamp = message.timestamp;
  postMeasurement(timestamp, body, remoteAddress, _callback);
});