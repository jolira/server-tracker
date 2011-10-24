(function($) {
  var charts; // global
  var metaCache = {};
  var config = undefined;
  var range = {
    start : "1 hour ago",
    end : "now"
  };

  function getGraphs() {
    if (!config) {
      throw new Error("config not loaded");
    }

    var graphs = config.graphs;

    if (!graphs) {
      graphs = config.graphs = [];
    }

    return graphs;
  }

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

    var graphs = getGraphs();
    var graph = {};

    graphs.push(graph);

    graphID = graphs.length;

    addMetric(graphID, graph);
  }

  function renderGraph(graphID, result) {
    var series = [];
    for(var name in result) {
      var data = result[name];
      series.push({
        "name" : name,
        "data" : data
      });
    }
    charts[graphID] = new Highcharts.Chart({
        "chart": {
            "renderTo": "container"
        },
        "series" : series
    });
  }

  function loadGraphs(graphID, gcfg) {
    var count = $("#dataPointCount").val();
    var payload = {
        "type" : "query",
        "start": convert2date(range.start),
        "end": convert2date(range.end),
        "count": count,
        "qualifier": gcfg.qualifier,
        "series" : gcfg.series
    };

    $.ajax({
      type : 'POST',
      url : "/query",
      dataType: 'json',
      data : payload,
      success : function(result) {
        renderGraph(graphID, result);
      },
      error : function(xhr) {
        // TODO: better error handling
        console.log(xhr.responseText);
      }
    });
  }

  function setup(loaded) {
    config = loaded;

    var addLink = $("#addGraph");

    addLink.click(addGrapth);
    addLink.show();

    var graphs = $("#graphs");

    graphs.empty();

    charts = {};

    // TODO: Handle non-default dashboards
    var gcfgs = config["default"].graphs;

    for ( var idx in gcfgs) {
      var graphID = "graph" + idx;
      var gcfg = gcfgs[idx];
      var graphDiv = $('<div/>', {
        "id" : graphID,
        "style" : gcfg.style || "width: 100%; height: 400px"
      });

      graphs.append(graphDiv);
      loadGraphs(graphID, gcfg);
    }

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
        setup(config.dashboards);
      },
      error : function(xhr) {
        $("#graphs").text(xhr.responseText);
      }
    });
  });
})(jQuery);