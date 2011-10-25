(function($) {
  var charts; // global
  var metaCache = {};
  var config = undefined;
  var range = {
    start : "1 hour ago",
    end : "now"
  };

  function showMetrics(metadata) {
    alert(metadata);
  }

  function convert2date(str) {
    var date = Date.parse(str);

    if (!isNaN(date)) {
      return date;
    }

    if (!str || str.toLowerCase() === "now") {
      return $.now();
    }

    var split = str.split(" ");

    if (split.length != 3 || split[2] !== "ago") {
      return undefined;
    }

    var count = parseInt(split[0]);

    if (isNaN(count)) {
      return undefined;
    }

    var multiplier = split[1].toLowerCase();

    if (multiplier === "second" || multiplier === "seconds") {
      return $.now() - count * 1000;
    }

    if (multiplier === "minute" || multiplier === "minutes") {
      return $.now() - count * 1000 * 60;
    }

    if (multiplier === "hour" || multiplier === "hours") {
      return $.now() - count * 1000 * 60 * 60;
    }

    if (multiplier === "day" || multiplier === "days") {
      return $.now() - count * 1000 * 60 * 60 * 24;
    }

    if (multiplier === "weeek" || multiplier === "weeks") {
      return $.now() - count * 1000 * 60 * 60 * 24 * 7;
    }

    if (multiplier === "month" || multiplier === "months") {
      return $.now() - count * 1000 * 60 * 60 * 24 * 30.4375;
    }

    if (multiplier === "year" || multiplier === "years") {
      return $.now() - count * 1000 * 60 * 60 * 24 * 365.25;
    }

    return undefined;
  }

  function loadAvailableFields(graphID, graph, collection) {
    var metadata = metaCache[collection];

    if (metadata) {
      showMetrics(graphID, graph, collection, metadata);
      return;
    }

    $.ajax({
      type : 'POST',
      url : "/query",
      data : {
        "type" : "metadata",
        "start": convert2date(range.start),
        "end": convert2date(range.end),
      },
      success : function(metadata) {
        metaCache[collection] = metadata;

        showMetrics(graphID, graph, collection, metadata);
      },
      error : function(xhr) {
        console.log(xhr.responseText);
        // TODO: Better error handling
      }
    });
  }

  function addMetric(graphID, graph) {
    var form = $('<form/>', {
      id : 'metricSelector',
    });
    var select = $('<select/>', {
      id : 'collection',
      change : function() {
        var self = $(this);
        var collection = self.val();

        loadAvailableFields(graphID, graph, collection);
      }
    });

    $.each([ "select one", "jmx", "metric", "record" ], function(key, value) {
      select.append($('<option/>', {
        value : value,
        text : value
      }));
    });
    form.append(select);
    form.insertAfter("#addGraph");
  }

  function addGrapth() {
    $("#addGraph").hide();

    var graphs = config.dashboards.graphs;
    var graph = {};

    graphs.push(graph);

    graphID = graphs.length;

    addMetric(graphID, graph);
  }

  function getValue(key, value) {
    var val = value[key];

    if (val) {
        return val;
    }

    var index = key.indexOf('.');

    if (index == -1) {
       return undefined;
    }

    var _key = key.substr(0, index);

    val = value[_key];

    if (!val) {
        return undefined;
    }

    return getValue(key.substr(index+1), val);
  }

  function renderGraph(graphID, gcfg, result) {
    var series = [];
    for(var idx in result) {
      var group = result[idx];
      for(var labelKey in gcfg.render) {
         var valueKey = gcfg.render[labelKey];
         var label = getValue(labelKey, group);
         var value = getValue("stats." + valueKey, group);

         if (value) {
            series.push({ "name" : label || labelKey, "data" : value });
         }
      }
    }
    charts[graphID] = new Highcharts.Chart({
        "chart": {
            "renderTo": "container"
        },
        "series" : series
    });
  }

  function loadGraphs(graphID, gcfg, loader) {
    loader(gcfg.query, function(result) {
      renderGraph(graphID, gcfg, result);
    });
  }

  function getLoader(query, start, end, count) {
    var result;
    var callbacks = [];

    $.ajax({
      type : 'POST',
      url : "/query",
      dataType: 'json',
      data : {
        "type" : "query",
        "start": start,
        "end": end,
        "count": count,
        "collection" : query.collection,
        "groupBy" : query.groupBy || {},
        "qualifier" : query.qualifier || {},
        "keys" : query.keys || {}
      },
      success : function(_result) {
        result = _result;
        _.each(callbacks, function(callback) {
          callback(_result);
        });
      },
      error : function(xhr) {
        // TODO: better error handling
        console.log(xhr.responseText);
      }
    });

    return function(callback) {
        if (result) {
            return callback(result);
        }

        callbacks.push(callback);
    }
  }

  function loadDashboard(dashboard) {
    var graphs = $("#graphs");

    graphs.empty();

    charts = {};

    // TODO: Handle non-default dashboards
    var start = convert2date(range.start);
    var end =  convert2date(range.end);
    var count = $("#count").val();
    var gcfgs = config.dashboards[dashboard].graphs;
    var cache = {};

    for ( var idx in gcfgs) {
      var graphID = "graph" + idx;
      var gcfg = gcfgs[idx];
      var graphDiv = $('<div/>', {
        "id" : graphID,
        "style" : gcfg.style || "width: 100%; height: 400px"
      });

      graphs.append(graphDiv);
      loadGraphs(graphID, gcfg, function(query, callback) {
        var result = cache[query];

        if (result) {
            return result(callback);
        }

        var _query = config.queries[query];
        result = cache[query] = getLoader(_query, start, end, count);

        return result(callback);
      });
    }
  }

  function setup(loaded) {
    config = loaded;

    var addLink = $("#addGraph");

    addLink.click(addGrapth);
    addLink.show();

    loadDashboard("default");
    // TODO: Add graphs here.
  }

  $(function() {
    $("#start").val(range.start);
    $("#end").val(range.end);
    $.ajax({
      type : 'POST',
      url : "/query",
      data : {
        "type" : "config"
      },
      success : function(config) {
        setup(config);
      },
      error : function(xhr) {
        $("#graphs").text(xhr.responseText);
      }
    });
  });
})(jQuery);