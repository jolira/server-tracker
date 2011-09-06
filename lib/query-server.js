var _ = require('underscore');

function decPending(context) {
    var count = --context.pending;
    
    if (count < 1) {
      // console.log("result=%s", require("util").inspect(context.result, false,
      // 100));
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

function processMetaResult(context, doc, seriesQuery) {
  
}

function average(name, context, bucket, value) {
  if (!context.sum) {
    context.sum = {};
  }

  var sum = context.sum[name];
  
  if (!sum) {
      context.sum[name] = sum = [];
  }
  
  var count = sum[bucket] ? sum[bucket] : 0;
  var count1 = count + 1;
  
  sum[bucket] = count1;

  var data = context.result.data[name];
  var current = data[bucket] ? data[bucket] : 0;
  
  data[bucket] = (count * current + value) / count1;
}

function min(name, context, bucket, value) {
  var data = context.result.data[name];
  var current = data[bucket];
  
  if (!current || current > value) {
    data[bucket] = value;
  }
}

function max(name, context, bucket, value) {
  var data = context.result.data[name];
  var current = data[bucket];
  
  if (!current || current < value) {
    data[bucket] = value;
  }
}

/**
 * Process the results from the query
 * 
 * @param context
 *            the context with lots of parameters
 * @param doc
 *            the document loaded from the database
 * @param series
 *            the query submitted by the client
 */
function processSeriesQueryResult(context, doc, series) {
    var _timestamp = split(series.timestamp);
    var timestamp = getFieldValue(doc, _timestamp);

    if (!timestamp) {
        return;
    }

    var bucket = Math.floor((timestamp - context.start) / context.increment);

    for(var name in series.series) {
      var serie = series.series[name];
      var operation = serie.operation.toLowerCase();
      var field = split(serie.field);
      var value = getFieldValue(doc, field);

      if (!value) {
        return;
      }

      if (!context.result.data[name]) {
          context.result.data[name] = [];
      }

      if (operation === "avg") {
        average(name, context, bucket, value);
      } else if (operation === "min") {
        min(name, context, bucket, value);
      } else if (operation === "max") {
        max(name, context, bucket, value);
      }
    }
}

function createQualifier(context, series) {
  var q = {};

  q[series.timestamp] = {
      "$gt" : context.start,
      "$lt" : context.end
  };

  if (series.qualifier) {
      for (qualifier in series.qualifier) {
          var value = series.qualifier[qualifier];

          q[qualifier] = value;
      }
  }

  return q;
}

function submitSeriesQuery(context, series) {
    context.pending++;
    context.db.collection(series.collection, function(error, collection) {
        if (error) {
          throw error;
        }

        var q = createQualifier(context, series);

        collection.find(q, {
            "sort" : [ series.timestamp ]
        }, function(err, cursor){
            if (err) {
                throw err;
            }

            cursor.each(function(err, doc) {
                if (err) {
                  throw err;
                }

                if (doc) {
                  context.callback(context, doc, series);
                }
                else {
                  decPending(context);
                }
            });
        });
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

function queryDashboardds(config, res) {
  var properties = config.properties ? config.properties : {};
  var dashboards = properties.dashboards ? properties.dashboards : {};
  
  res.send(dashboards);
}

function submitQueries(db, query, res, callback) {
  var count = parseInt(query.count);
  var from = parseInt(query.range.from);
  var until = parseInt(query.range.until);
  var context = {
      "db" : db,
      "pending" : 0,
      "result" : {
          "data" : {}
      },
      "increment" : (until - from) / count,
      "start" : from,
      "end" : until,
      "count" : count,
      "res" : res,
      "callback" : callback
  };

  for ( var idx in query.data) {
      var series = query.data[idx];

      submitSeriesQuery(context, series);
  }

  return context;
}

/**
 * Create a new server.
 * 
 * @param db
 *            the mongo database object
 * @param config
 *            the configuration manager
 * 
 * @returns {QueryServer} the sever
 */
function QueryServer(db, config) {
    this.db = db;
    this.config = config;
}

/**
 * Process are query posted to the server.
 * 
 * @param req
 *            the request object (from express)
 * @param res
 *            the response object (from express)
 */
QueryServer.prototype.postQuery = function(req, res) {
    var query = req.body;
    var type = query.type;

    if (type === "dashboards") {
      queryDashboardds(this.config, res);
      return;
    }

    if (type === "metadata") {
      submitQueries(this.db, query, res, processMetaResult);
      return;
    }

    if (type) {
      throw new Error("unsupported type " + type);
    }

    var context = submitQueries(this.db, query, res, processSeriesQueryResult);
    
    context.result.labels = getLabels(context);
};

/**
 * Export the server
 */
module.exports = QueryServer;
