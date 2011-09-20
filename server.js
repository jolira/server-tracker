var Server = require('./lib/server');
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
  
    server = new Server(options);
};

module.exports.stop = function() {
  if (!server) {
    throw new Error("not urnning");
  }

    server.stop();
    server = null;
};
