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

    server = launcher.start(options);
}

function stop() {
  if (!server) {
    throw new Error("not urnning");
  }

    server.stop();
    server = null;
}

var argv = process.argv;

for (var idx = 2; idx < argv.length; idx++) {
  var arg = argv[idx];
  if (arg === "--profile") {
    require("v8-profiler");
    argv.splice(idx, 1);
  }
}

process.title = "server-tracker";

config.bootstrap(function(options){
  start(options);
});
