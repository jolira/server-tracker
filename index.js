var express = require('express');
var mustachio = require('mustachio');
var configuration = require('./lib/config');
var MetricServer = require('./lib/metric-server');
var QueryServer = require('./lib/query-server');
var Server = require('./lib/server');
var openDB = require('./lib/db');
var jmxScrapper = require('./lib/jmx-scrapper');

function startServices(server, db, config) {
    var services = {
        metricServer : new MetricServer(db),
        queryServer : new QueryServer(db),
    };

    if (config.properties.jmx) {
        config.properties.jmx = {};
    }

    services.jmx = jmxScrapper.start(db, config);

    // Routes
    server.post('/submit/metric', function(req, res) {
        services.metricServer.postMetric(req, res);
    });
    server.post('/query*', function(req, res) {
        services.queryServer.postQuery(req, res);
    });

    return services;
}

function stopServices(services) {
    jmxScrapper.start(services.jmx);
}

function startServer(options) {
    var listenPort = options.listenPort ? options.listenPort : 3080;
    var server = new Server();

    console.info("Listening to port %d", listenPort);

    server.listen(listenPort);

    return server;
}

module.exports = function(options) {
    var mongo = options.mongo ? options.mongo : {};
    var server = startServer(options);

    openDB(mongo, function(db) {
        configuration(db, function(config) {
            var services = startServices(server, db, config);

            config.on('change', function(config) {
                stopServices(services);

                services = startServices(server, db, config);
            });
        });
    });
};
