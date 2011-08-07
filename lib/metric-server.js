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
