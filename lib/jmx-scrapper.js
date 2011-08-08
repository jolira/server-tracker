var util = require("util");
var _ = require("underscore");
var jolokia = require("jolokia-client");

function report(db, url, mbean, response) {
    var status = response.status;

    if (status !== 200) {
        console.error("failed to read mbean %s from %s: %s", mbean, url, util.inspect(response));
        return;
    }

    var date = new Date();
    var timestamp = date.getTime();

    db.collection('jmx', function(error, collection) {
        if (error) {
            console.error(error);
            return;
        }

        collection.insert({
            "timestamp" : timestamp,
            "url" : url,
            "mbean" : mbean,
            "response" : {
                "timestamp" : response.timestamp * 1000,
                "value" : response.value
            }
        });
    });

}

function scrape(db, url, entry) {
    var interval = entry.interval ? entry.interval : 15000;
    var mbeans = entry.mbeans;

    if (!_.isArray(mbeans)) {
        mbeans = [ mbeans ];
    }

    console.log("scanning %s on %s every %dms", util.inspect(mbeans), url, interval);

    var client = new jolokia(url);

    setInterval(function() {
        for (idx in mbeans) {
            var mbean = mbeans[idx];

            client.read(mbean, function(response) {
                report(db, url, mbean, response);
            });
        }
    }, interval);
}

module.exports = function(db, jmx) {
    if (!jmx) {
        console.log("no jmx information defined");
        return;
    }

    for ( var url in jmx) {
        var entry = jmx[url];

        scrape(db, url, entry);
    }
};
