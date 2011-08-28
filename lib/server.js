var util = require('util');
var express = require('express');
var mustachio = require('mustachio');

function Server() {
    var app = this.app = express.createServer();

    // Configuration
    this.app.configure(function() {
        app.use(express.static(__dirname + '/../public'));
        app.set('views', __dirname + '/../views');
        app.register('.mustache', mustachio);
        app.set('view engine', 'mustache');
        app.use(express.bodyParser());
        app.use(express.methodOverride());
        app.use(app.router);
        app.use(express.static(__dirname + '/public'));
    });

    this.app.configure('development', function() {
        app.use(express.errorHandler({
            dumpExceptions : true,
            showStack : true
        }));
    });

    this.app.configure('production', function() {
        app.use(express.errorHandler());
    });

    this.app.get('/', function(req, res) {
        res.render('index', {
            title : 'Server Tracker'
        });
    });

}

Server.prototype.post = function(path, callback) {
    this.app.post(path, callback);
};

Server.prototype.listen = function(listenPort) {
    this.app.listen(listenPort);

    var address = this.app.address();

    console.log("Server listening %s in %s mode", util.inspect(address), this.app.settings.env);
};

Server.prototype.stop = function() {
    // do nothing
};

module.exports = Server;
