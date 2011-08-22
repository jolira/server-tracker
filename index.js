var express = require('express');
var mustachio = require('mustachio');
var MetricServer = require('./lib/metric-server');
var QueryServer = require('./lib/query-server');
var Server = require('./lib/server');
var openDB = require('./lib/db');
var scrapeJXM = require('./lib/jmx-scrapper');

module.exports = function(options) {
    var mongo = options.mongo ? options.mongo : {};

    openDB(mongo, function(db) {
        var metricServer = new MetricServer(db);
        var queryServer = new QueryServer(db);

        scrapeJXM(db, options.jmx);

        var server = new Server();

        // Routes
        server.post('/submit/metric', function(req, res) {
            metricServer.postMetric(req, res);
        });
        server.post('/query*', function(req, res) {
            queryServer.postQuery(req, res);
        });

        // Listen
        var listenPort = options.listenPort ? options.listenPort : 3080;

        console.info("Listening to port %d", listenPort);

        server.listen(listenPort);
    });
};
