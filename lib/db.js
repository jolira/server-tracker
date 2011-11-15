var mongodb = require('mongodb');
var _ = require('underscore');
module.exports = function(options, callback, slaveOk) {
  var replicas = options["replica-set"];
  if (!replicas) {
    replicas = [{}];
  }
  else if (!_.isArray(replicas)) {
    replicas = [replicas];
  }
  var servers = [];
  for (var idx in replicas) {
    var svr = replicas[idx];
    var name = svr.server ? svr.server : "localhost";
    var port = svr.port ? svr.port : 27017;
    servers.push(new mongodb.Server(name, port, {
      "auto_reconnect" : true,
      "read_secondary" : true
    }));
  }
  var replicas = new mongodb.ReplSetServers(servers);
  var database = options.database ? options.database : "server-tracker";
  var db = new mongodb.Db(database, replicas);
  db.open(function(err, db) {
    if (err) {
      throw err;
    }
    callback(db);
  });
};