var express = require('express');
var mustachio = require('mustachio');
var configuration = require('./lib/config');
var MetricServer = require('./lib/metric-server');
var QueryServer = require('./lib/query-server');
var Server = require('./lib/server');
var openDB = require('./lib/db');
var scrapeJXM = require('./lib/jmx-scrapper');

module.exports = function(options) {
    var mongo = options.mongo ? options.mongo : {};

    openDB(mongo, function(db) {
        configuration(db, function(config) {
            var metricServer = new MetricServer(db);
            var queryServer = new QueryServer(db);
            // var metaServer = new MetaServer(db, [ scrapeJXM.collection,
            // MetricServer.collection ]);

            if (config.jmx) {
                config.jmx = {};
            }

            scrapeJXM.run(db, config);

            var server = new Server();

            // Routes
            server.post('/submit/metric', function(req, res) {
                metricServer.postMetric(req, res);
            });
            server.post('/query*', function(req, res) {
                queryServer.postQuery(req, res);
            });
            server.post('/meta*', function(req, res) {
                metaServer.postQuery(req, res);
            });

            // Listen
            var listenPort = options.listenPort ? options.listenPort : 3080;

            console.info("Listening to port %d", listenPort);

            server.listen(listenPort);
        });
    });
};
