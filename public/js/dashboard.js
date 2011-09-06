(function($) {
  var charts; // global
  var metaCache = {};
  var config = undefined;
  var range = {
    from : "1 hour ago",
    until : "now"
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

  function externalizeRange() {
    return {
      from : convert2date(range.from),
      until : convert2date(range.until),
    };
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
        type : "metadata",
        range : externalizeRange(),
        collection : collection
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

  function loadGraphs(graphID, graphConfig) {
    var _count = $("#dataPointCount").val();
    var count = parseInt(_count);
    var range = externalizeRange();

    $.ajax({
      type : 'POST',
      url : "/query",
      data : {
        data : graphConfig.data,
        range : range,
        count : count
      },
      success : function(data) {
        console.log(data);
      },
      error : function(xhr) {
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

    charts = [];

    // TODO: Handle non-default dashboards
    var graphsConfig = config["default"].graphs;

    for ( var idx in graphsConfig) {
      var graphID = "graph" + idx;
      var graphConfig = graphsConfig[idx];
      var graphDiv = $('<div/>', {
        "id" : graphID,
        "style" : "100%",
        "height" : "400px"
      });

      graphs.append(graphDiv);
      loadGraphs(graphID, graphConfig);
    }

    // TODO: Add graphs here.
  }

  $(function() {
    $("#from").val(range.from);
    $("#until").val(range.until);
    $.ajax({
      type : 'POST',
      url : "/query",
      data : {
        type : "dashboards"
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