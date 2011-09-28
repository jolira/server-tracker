var events = require('events');

function ConfigurationManager(collection, entry) {
  this.collection = collection;
  this.properties = entry ? entry.properties : {};
  this.emitter = new events.EventEmitter();
}
ConfigurationManager.prototype.on = function(event, callback) {
  this.emitter.on(event, callback);
};
ConfigurationManager.prototype.save = function(properties) {
  var date = new Date();
  var timestamp = date.getTime();
  var self = this;
  this.collection.insert({
    "timestamp": timestamp,
    "properties": properties
  }, function(err, doc) {
    if (err) {
      throw err;
    }
    self.emitter.emit('changed', this);
  });
};
module.exports = function(db, callback) {
  db.collection('config', function(error, collection) {
    if (error) {
      console.error(error);
      return;
    }
    collection.createIndex([
      ['all'],
      ['_id', 1],
      ['timstamp', 1]
    ], function(err) {
      if (err) {
        throw err;
      }
    });
    collection.find({}, {
      "sort": [
        ["timestamp", "descending"]
      ]
    }, function(err, cursor) {
      if (err) {
        throw err;
      }
      cursor.nextObject(function(err, properties) {
        if (err) {
          throw err;
        }
        var result = new ConfigurationManager(collection, properties);
        callback(result);
      });
    });
  });
};