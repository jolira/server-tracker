var util = require('util');
var express = require('express');
var mustachio = require('mustachio');
var MetricServer = require('./lib/metric-server');
var Server = require('./lib/server');

module.exports = function(listenPort, database, dbServer, dbPort) {
    var server = new Server();
    var metricServer = new MetricServer(database, dbServer, dbPort);

    // Routes
    server.post('/submit/metric', function(req, res) {
        metricServer.postMetric(req, res);
    });

    server.listen(listenPort);
};
