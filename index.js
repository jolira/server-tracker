var express = require('express');
var mustachio = require('mustachio');

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

app.get('/', function(req, res) {
    res.render('index', {
        title : 'Server Tracker'
    });
});

app.listen(3080);
console.log("Server listening on port %d in %s mode", app.address().port, app.settings.env);
