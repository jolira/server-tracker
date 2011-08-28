var events = require('events');

function ConfigurationManager(collection, entry) {
    this.collection = collection;
    this.properties = entry ? entry.properties : {};
    this.emitter = new events.EventEmitter();
}

ConfigurationManager.prototype.on = function(event, callback) {
    this.emitter.on(event, callback);
};

ConfigurationManager.prototype.save = function(callback) {
    events.EventEmitter.call(this);

    var date = new Date();
    var timestamp = date.getTime();

    collection.insert({
        "timestamp" : timestamp,
        "properties" : this.properties
    }, function(doc) {
        emitter.emit('changed', doc.properties);
    });
};

module.exports = function(db, callback) {
    db.collection('config', function(error, collection) {
        if (error) {
            console.error(error);
            return;
        }

        collection.find({}, {
            "sort" : [ [ "timestamp", "ascending" ] ]
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
