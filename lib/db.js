var mongodb = require('mongodb');

module.exports = function(database, server, port) {
    var Db = mongodb.Db;
    var Server = mongodb.Server;
    // var Connection = mongodb.Connection;
    // var BSON = mongodb.BSON;
    // var ObjectID = mongodb.ObjectID;

    var svr = new Server(server, port, {
        auto_reconnect : true
    }, {});

    var db = new Db(database, svr, {
        native_parser : true
    });

    db.open(function() {
    });

    return db;
};
