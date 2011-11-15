var listener = require('./lib/listener');
var config = require('./lib/config');
var server;

/**
 */
function shutdown(callback) {
  console.log('Shutting down...');
  if (server) {
    server.stop(function(){
      delete server;
      callback();
    });
  }
  else {
      callback;
  }
}

function start(options) {
  if (server) {
    throw new Error("already running");
  }

  console.log("options: %j", options);

  if (options.mongo) {
    console.error("no mongo entry");
    return;
  }

  server = listener.start(options);
}

process.on('uncaughtException', function(err) {
  console.log(err.stack);
  shutdown(function(){
    start();
  });
});

process.on('SIGINT', function() {
  console.log('Shutting down...');
  shutdown(function(){
    process.exit();
  });
});

process.title = "server-tracker";

config.bootstrap(function(options){
  config.load(options, function(options) {
    start(options);
  });
});
