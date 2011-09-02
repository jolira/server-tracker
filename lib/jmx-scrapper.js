var util = require("util");
var _ = require("underscore");
var jolokia = require("jolokia-client");

var collectionName = module.exports.collection = "jmx";

function report(collection, url, mbeans, response) {
    var records = [];
    for ( var idx in response) {
        var result = response[idx];
        var status = result.status;
        var bean = mbeans[idx];

        if (status !== 200) {
            console.error("failed to read mbeans %s from %s: %s", bean, url, util.inspect(result));
            return;
        }

        var date = new Date();
        var timestamp = date.getTime();
        var responseTimestamp = result.timestamp * 1000;
        var value = result.value;

        records.push({
            "timestamp" : timestamp,
            "url" : url,
            "mbean" : bean,
            "response" : {
                "timestamp" : responseTimestamp,
                "value" : value
            }
        });
    }

    collection.insert(records, function(err) {
        if (err) {
            console.error("failed to insert %s, because of %s", util.inspect(records, false, 100), err);
        }
    });
}

function scrape(collection, url, entry) {
    var interval = entry.interval ? entry.interval : 15000;
    var mbeans = entry.mbeans;

    if (!_.isArray(mbeans)) {
        mbeans = [ mbeans ];
    }

    var client = new jolokia(url);

    return setInterval(function() {
        console.log("scanning %s on %s every %dms", util.inspect(mbeans), url, interval);

        client.read(mbeans, function(response) {
            if (response) {
                report(collection, url, mbeans, response);
            }
        });
    }, interval);
}

module.exports.start = function(db, config) {
    var jmx = config.properties[collectionName];
    var ids = [];

    db.collection(collectionName, function(error, collection) {
        if (error) {
            console.error(error);
            return;
        }

        for ( var idx in jmx) {
            var entry = jmx[idx];
            var targets = entry.targets;

            for ( var i in targets) {
                var url = targets[i];
                var id = scrape(collection, url, {
                    "interval" : entry.interval,
                    "mbeans" : entry.mbeans
                });

                ids.push(id);
            }
        }
    });

    return ids;
};

module.exports.stop = function(ids) {
    for ( var idx in ids) {
        var id = idx[idx];

        clearInterval(id);
    }

    return ids;
};
