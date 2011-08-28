var util = require("util");
var _ = require("underscore");
var jolokia = require("jolokia-client");

var collectionName = module.exports.collection = "jmx";

function report(collection, url, mbean, response) {
    var status = response.status;

    if (status !== 200) {
        console.error("failed to read mbean %s from %s: %s", mbean, url, util.inspect(response));
        return;
    }

    var date = new Date();
    var timestamp = date.getTime();
    var responseTimestamp = response.timestamp * 1000;

    if (!_.isArray(mbean)) {
        collection.insert({
            "timestamp" : timestamp,
            "url" : url,
            "mbean" : mbean,
            "response" : {
                "timestamp" : responseTimestamp,
                "value" : response.value
            }
        });

        return;
    }

    for ( var idx in mbean) {
        var bean = mbean[idx];
        var value = response.value[idx];

        collection.insert({
            "timestamp" : timestamp,
            "url" : url,
            "mbean" : bean,
            "response" : {
                "timestamp" : responseTimestamp,
                "value" : value
            }
        });
    }
}

function scrape(collection, url, entry) {
    var interval = entry.interval ? entry.interval : 15000;
    var mbeans = entry.mbeans;

    if (!_.isArray(mbeans)) {
        mbeans = [ mbeans ];
    }

    console.log("scanning %s on %s every %dms", util.inspect(mbeans), url, interval);

    var client = new jolokia(url);

    return setInterval(function() {
        for (idx in mbeans) {
            var mbean = mbeans[idx];

            client.read(mbean, function(response) {
                if (response) {
                    report(collection, url, mbean, response);
                }
            });
        }
    }, interval);
}

module.exports.start = function(db, config) {
    var jmx = config[collectionName];
    var ids = [];

    db.collection(collectionName, function(error, collection) {
        if (error) {
            console.error(error);
            return;
        }

        for ( var url in jmx) {
            var entry = jmx[url];
            var id = scrape(collection, url, entry);

            ids.push(id);
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
