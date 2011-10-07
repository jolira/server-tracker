var _ = require("underscore");
var master = require("../lib/master");
var Server = require('../lib/express-server');
var masters = [];

function startMaster(port) {
  var svr = new Server();
  master.start('/master', ["localhost:4000", "localhost:4001", "localhost:4002"], "localhost:" + port, function(server) {
    masters.push(server);
    svr.post('/master', function(req, res) {
      server.postStatus(req, res);
    });
    svr.listen(port);
  });
}

for(var port=4000; port < 4100; port++) {
  startMaster(port);
}

var counter = 0;

_.each(masters, function(master){
    master.isMaster(function(flag){
        if (!flag) {
            if (++counter === 99) {
                process.exit(0);
            }
        } else {
            console.log("master", master);
        }
    });
});