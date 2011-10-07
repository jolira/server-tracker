var _ = require("underscore");
var master = require("../lib/master");
var Server = require('../lib/express-server');
var masters = [];

function startMaster(port) {
  var svr = new Server();
  master.start('/master', [{"server":"localhost", "port":4000}, {"server":"localhost", "port":4025}], "localhost:" + port, function(server) {
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