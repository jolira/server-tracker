var express = require('express');
var mustachio = require('mustachio');
var MetricServer = require('./lib/metric-server');
var QueryServer = require('./lib/query-server');
var Server = require('./lib/server');
var openDB = require('./lib/db');
var scrapeJXM = require('./lib/jmx-scrapper');

module.exports = function(options) {
    options = options ? options : {};

    var listenPort = options.listenPort ? options.listenPort : 3080;
    var database = options.database ? options.database : "metrics";
    var dbServer = options.dbServer ? options.dbServer : "localhost";
    var dbPort = options.dbPort ? options.dbPort : 27017;

    console.log("{listenPort: %d, database: %s, db-server: %s, dbPort: %d}", listenPort, database, dbServer, dbPort);

    var server = new Server();
    var db = openDB(database, dbServer, dbPort);
    var metricServer = new MetricServer(db);
    var queryServer = new QueryServer(db);

    scrapeJXM(db, options.jmx);

    // Routes
    server.post('/submit/metric', function(req, res) {
        metricServer.postMetric(req, res);
    });

    // Routes
    server.post('/query', function(req, res) {
        queryServer.postQuery(req, res);
    });

    server.listen(listenPort);
};
