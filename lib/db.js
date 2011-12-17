/**
 * Export a function that opens our database.
 */
// We are using the mongodb driver to access the database
var mongodb = require('mongodb');
// We are using the underscore library to test if the list of replicas
// in the options is a an array or not. We are also using the "each"
// function from the library to iterate through the replicas.
var _ = require('underscore');
/**
 * Export a function that opens the mongodb database.
 * @param options  describes the database that should be opened. options["replica-set"]
 *                 contains the list of all servers that make up the mongodb replica set.
 *                 Each entry in options["replica-set"] should contain a server and a port.
 *                 options.database specifies the name of the database to open. If no such
 *                 name is specified, the name of the database defaults to "server-tracker".
 * @param callback this function is called when when the database has been opened. The first
 *                 parameter is a mongo database object.
 * @param slaveOK  set to {@literal true} if the client can work with secondary member of the
 *                 replica set, not only with primary ones.
 */
module.exports = function(options, callback, slaveOk) {
  var replicas = options["replica-set"] || [{}];
  if (!_.isArray(replicas)) {
    replicas = [replicas];
  }
  var servers = [];
  _.each(replicas, function(svr) {
    var name = svr.server || "localhost";
    var port = svr.port || 27017;
    servers.push(new mongodb.Server(name, port, {
      "auto_reconnect" : true,
      "read_secondary" : true
    }));
  });
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