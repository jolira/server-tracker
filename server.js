var main = require('./lib/main');
var server;

process.on('uncaughtException', function(err) {
  console.error(err);
});

process.on('SIGINT', function() {
    console.log('Shutting down...');
    server.stop();
    process.exit(1);
});

module.exports.start = function(options) {
  if (server) {
    throw new Error("already running");
  }
  
    server = main.start(options);
};

module.exports.stop = function() {
  if (!server) {
    throw new Error("not urnning");
  }

    server.stop();
    server = null;
};
