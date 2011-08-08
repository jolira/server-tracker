var util = require('util');

function executeQuery(context, collection, name, query) {
    context.pending++;

    // var timestamp = query.timestamp;
    var cursor = collection.find(/*
                                     * "", { "sort" : [ timestamp ] }
                                     */);

    cursor.each(function(err, doc) {
        context.pending--;
        console.log("err: %s, doc: %s, pending: %d", util.inspect(err), util.inspect(doc), context.pending--);
    });

}

function executeQueries(context, collectionName, series) {
    context.pending++;
    context.db.collection(collectionName, function(error, collection) {
        if (error) {
            console.error(error);
            context.pending--;
            return;
        }

        for (name in series) {
            var query = series[name];

            executeQuery(context, collection, name, query);
        }

        context.pending--;
    });

}

function QueryServer(db) {
    this.db = db;
}

QueryServer.prototype.postQuery = function(req, res) {
    var query = req.body;
    var collections = query.collections;
    var context = {
        "db" : this.db,
        "pending" : 0,
        "start" : query.start,
        "end" : query.end,
        "count" : query.count
    };

    for ( var collection in collections) {
        var series = collections[collection];

        executeQueries(context, collection, series);
    }

    res.send(true);
};

module.exports = QueryServer;
