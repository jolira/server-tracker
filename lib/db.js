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
 *                 replica set, not only with primary ones. Secondaries may return data that
 *                 is slightly out of date.
 */
module.exports = function(options, callback, slaveOk) {
  // get the list of replicas or a list with only one entry if no replicas where specified
  // in the options.
  var replicas = options["replica-set"] || [{}];
  // if the replicas are not an array, put them into one.
  if (!_.isArray(replicas)) {
    // Wrap the replicas object into an array
    replicas = [replicas];
  }
  // New empty list of servers
  var servers = [];
  // for create a mongo server object for each element in the replica set.
  _.each(replicas, function(svr) {
    // use the server name or "localhost" if not is specified
    var name = svr.server || "localhost";
    // use the server port or 27017 if none was specified
    var port = svr.port || 27017;
    // add the new server object to be back of the array.
    // Each server automatically reconnects and reads from
    // the secondary if slaveOk.
    servers.push(new mongodb.Server(name, port, {
      "auto_reconnect" : true,
      "read_secondary" : slaveOk
    }));
  });
  // create the replica set object
  var replicas = new mongodb.ReplSetServers(servers);
  // the database name defaults to "server-tracker"
  var database = options.database || "server-tracker";
  // create the mongo database object
  var _db = new mongodb.Db(database, replicas);
  // open the database object. pass a callback funtion
  // that is called when the database is open. (<= Opening
  // the database is an asynchronous operation.)
  _db.open(function(err, db) {
    if (err) {
      throw err;
    }
    // This code is called after the database was opened.
    callback(db);
  });
};