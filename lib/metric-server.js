var _ = require('underscore');

function insertCycles(db, cycles, hostname, remoteAddress, timestamp) {
    if (!cycles) {
        return;
    }

    if (!_.isArray(cycles)) {
        cycles = [ cycles ];
    }

    db.collection('cycles', function(error, collection) {
        if (error) {
            console.error(error);
            return;
        }

        for ( var idx in cycles) {
            var cycle = cycles[idx];

            collection.insert({
                "timestamp" : timestamp,
                "remoteAddress" : remoteAddress,
                "hostname" : hostname,
                "cycle" : cycle
            });
        }
    });
}

function insertLogs(db, logs, hostname, remoteAddress, timestamp) {
    if (!logs) {
        return;
    }

    if (!_.isArray(logs)) {
        logs = [ logs ];
    }

    db.collection('logs', function(error, collection) {
        if (error) {
            console.error(error);
            return;
        }

        for ( var idx in logs) {
            var log = logs[idx];

            collection.insert({
                "timestamp" : timestamp,
                "remoteAddress" : remoteAddress,
                "hostname" : hostname,
                "log" : log
            });
        }
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
    var hostname = body.hostname;
    var cycles = body.cycles;
    var logs = body.logs;
    var date = new Date();
    var timestamp = date.getTime();

    insertCycles(this.db, cycles, hostname, remoteAddress, timestamp);
    insertLogs(this.db, logs, hostname, remoteAddress, timestamp);
};

module.exports = MetricServer;
