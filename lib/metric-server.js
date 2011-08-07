var _ = require('underscore');
var util = require('util');
var metricServer = {};
var mongodb = require('mongodb');

function MetricServer(database, server, port) {
    var Db = mongodb.Db;
    var Server = mongodb.Server;
    // var Connection = mongodb.Connection;
    // var BSON = mongodb.BSON;
    // var ObjectID = mongodb.ObjectID;

    var svr = new Server(server, port, {
        auto_reconnect : true
    }, {});
    this.db = new Db(database, svr, {
        native_parser : true
    });
    this.db.open(function() {
    });
}

MetricServer.prototype.postMetric = function(req, res) {
    // console.log(util.inspect(req));
    res.send(true); // send a response first
    var remoteAddress = req.client.remoteAddress;
    var body = req.body;
    var cycles = req.cycles;
    var hostname = body.hostname;
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
