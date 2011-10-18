var mongodb = require('mongodb');
var _ = require('underscore');
module.exports = function(options, callback) {
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
    servers[idx] = new mongodb.Server(name, port, {});
  }
  var _replicas = new mongodb.ReplSetServers(servers, {});
  var database = options.database ? options.database : "server-tracker";
  var db = new mongodb.Db(database, _replicas, {
    native_parser: false // https://github.com/christkv/node-mongodb-native/issues/377
  });
  db.open(function(err, db) {
    if (err) {
      throw err;
    }
    callback(db);
  });
};