var _ = require('underscore');
var util = require('util');
var metricServer = {};

function postCycle(timestamp, remoteAddress, hostname, cycle) {
    console.log(timestamp.getTime() + ": " + remoteAddress + "(" + hostname + ")");
}

metricServer.postMetric = function(req, res) {
    // console.log(util.inspect(req));
    res.send(true); // send a response first
    var remoteAddress = req.client.remoteAddress;
    var body = req.body;
    var cycles = req.cycles;
    var hostname = body.hostname;
    var timestamp = new Date();

    if (_.isArray(cycles)) {
        for ( var idx in cycles) {
            var cycle = cycles[idx];

            postCycle(timestamp, remoteAddress, hostname, cycle);
        }

        return;
    }

    postCycle(timestamp, remoteAddress, hostname, cycles);
};

module.exports = metricServer;
