var util = require('util');
var express = require('express');
var mustachio = require('mustachio');
var MetricServer = require('./lib/metric-server');

module.exports = function(listenPort, database, dbServer, dbPort) {
    var metricServer = new MetricServer(database, dbServer, dbPort);
    var app = module.exports = express.createServer();

    // Configuration
    app.configure(function() {
        app.set('views', __dirname + '/views');
        app.register('.mustache', mustachio);
        app.set('view engine', 'mustache');
        app.use(express.bodyParser());
        app.use(express.methodOverride());
        app.use(app.router);
        app.use(express.static(__dirname + '/public'));
    });

    app.configure('development', function() {
        app.use(express.errorHandler({
            dumpExceptions : true,
            showStack : true
        }));
    });

    app.configure('production', function() {
        app.use(express.errorHandler());
    });

    // Routes
    app.post('/submit/metric', function(req, res) {
        metricServer.postMetric(req, res);
    });

    app.get('/', function(req, res) {
        res.render('index', {
            title : 'Server Tracker'
        });
    });

    app.listen(3080);

    var address = app.address();

    console.log("Server listening %s in %s mode", util.inspect(address), app.settings.env);
};
