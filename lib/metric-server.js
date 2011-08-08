var _ = require('underscore');

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
    var date = new Date();
    var timestamp = date.getTime();

    if (!_.isArray(cycles)) {
        cycles = [ cycles ];
    }

    this.db.collection('cycles', function(error, collection) {
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
};

module.exports = MetricServer;
