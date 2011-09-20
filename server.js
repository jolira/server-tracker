var server = require('./lib/server');

process.on('uncaughtException', function(err) {
  console.log(err);
});

var svr = server({});

process.on('SIGINT', function() {
  console.log('Shutting down...');
  svr.stop();
  process.exit(1);
});

svr.start();