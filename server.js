var launcher = require('./lib/launcher');
var config = require('./lib/config');
var server;

process.on('uncaughtException', function(err) {
  console.log(err.stack);
});

process.on('SIGINT', function() {
    console.log('Shutting down...');
    server.stop();
    process.exit(1);
});

function start(options) {
  if (server) {
    throw new Error("already running");
  }

  var argv = process.argv;

  for (var idx = 2; idx < argv.length; idx++) {
    var arg = argv[idx];
    if (arg === "--profile") {
      require("v8-profiler");
    }
    if (arg === "--query-only") {
      options["query-only"] = true;
    }
}
    server = launcher.start(options);
}

function stop() {
  if (!server) {
    throw new Error("not urnning");
  }

    server.stop();
    server = null;
}

process.title = "server-tracker";

config.bootstrap(function(options){
  start(options);
});
