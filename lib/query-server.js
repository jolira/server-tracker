var util = require('util');
var _ = require('underscore');

function decPending(context) {
    var count = --context.pending;
    
    if (count < 1) {
        context.res.send(context.result);
    }
}

function split(s) {
    if (_.isString(s)) {
        return s.split('.');
    }

    return s;
}

function getFieldValue(value, field) {
    for ( var idx in field) {
        if (!value) {
            break;
        }

        var segment = field[idx];

        value = value[segment];
    }

    return value;
}

function populateResult(name, context, doc, field, _timestamp, operation) {
    var timestamp = getFieldValue(doc, _timestamp);

    if (!timestamp) {
        return;
    }

    var value = getFieldValue(doc, field);

    if (!value) {
        return;
    }

    var bucket = Math.floor((timestamp - context.start) / context.increment);
    
    if (operation === "AVG") {
        var helpers = context.helpers[name];
        
        if (!helpers) {
            context.helpers[name] = helpers = [];
        }
        
        var count = helpers[bucket] ? helpers[bucket] : 0;
        var count1 = count + 1;
        
        helpers[bucket] = count1;
        
        var data = context.result.data[name];
        
        if (!data) {
            context.result.data[name] = data = [];
        }
        
        var current = data[bucket] ? data[bucket] : 0;
        
        data[bucket] = (count * current + value) / count1;
    } else {
        context.result.data[name][bucket] = value;
    }
}

function executeQuery(context, collection, name, query) {
    context.pending++;

    var operation = query.operation;
    var timestamp = query.timestamp;
    var qualifiers = query.qualifiers;
    var field = split(query.field);
    var start = context.start;
    var end = context.end;
    var q = {};

    q[timestamp] = {
        "$gt" : start,
        "$lt" : end
    };

    if (qualifiers) {
        for (qualifier in qualifiers) {
            var value = qualifiers[qualifier];

            q[qualifier] = value;
        }
    }

    var cursor = collection.find(q, {
        "sort" : [ timestamp ]
    });
    
    var _timestamp = split(timestamp);

    cursor.each(function(err, doc) {
        if (err) {
            console.error(err);
            decPending(context);
            return;
        }

        if (!doc) {
            decPending(context);
            return;
        }

        populateResult(name, context, doc, field, _timestamp, operation);
    });
}

function executeQueries(context, collectionName, series) {
    context.pending++;
    context.db.collection(collectionName, function(error, collection) {
        if (error) {
            console.error(error);
            decPending(context);
            return;
        }

        for (name in series) {
            var query = series[name];

            executeQuery(context, collection, name, query);
        }

        decPending(context);
    });

}

function getLabels(context) {
    var start = context.end;
    var count = context.count;
    var result = [];
    
    for (var idx=0; idx < count; idx++) {
        if (idx % 4) {
            result.push("");
            continue;
        }
        
        var _start = start + idx * context.increment;
        var date = new Date(_start);
        var month=date.getMonth();
        var _date=date.getDate();
        var fullYear=date.getFullYear();
        var hours=date.getHours();
        var minutes=date.getMinutes();
        var seconds=date.getSeconds();
        var ms=date.getMilliseconds();
        
        result.push(month + "/" + _date + "/" + fullYear +  " " + hours + ":" + minutes + ":" + seconds +  "." + ms);
    }
        
    return result;
}

function QueryServer(db) {
    this.db = db;
}

QueryServer.prototype.postQuery = function(req, res) {
    var query = req.body;
    
    console.log("query: %s", util.inspect(query));
    
    var collections = query.collections;
    var context = {
        "db" : this.db,
        "pending" : 0,
        "helpers" : {},
        "result" : {
            "data" : {}
        },
        "increment" : (query.end - query.start) / query.count,
        "start" : query.start,
        "end" : query.end,
        "count" : query.count,
        "res" : res
    };

    context.result.labels = getLabels(context);
    
    for ( var collection in collections) {
        var series = collections[collection];

        executeQueries(context, collection, series);
    }
};

module.exports = QueryServer;
