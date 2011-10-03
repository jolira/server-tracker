var _ = require('underscore');
var openDB = require('./db');

/**
 * Create a new server.
 *
 * @param options
 *            the configuration manager
 *
 */
function QueryServer(options) {
  this.options = options;
}
/**
 * Start the server.
 *
 * @param callback
 *            the method to be called when the initialization finishes
 */
QueryServer.prototype.start = function(callback) {
  var self = this;
  openDB(this.options.mongo, function(db) {
    self.db = db;

    callback(self);
  });
};
/**
 * Stop the server.
 *
 * @param callback
 *            the method to be called when the initialization finishes
 */
QueryServer.prototype.stop = function(callback) {
    if (!this.db) {
        return;
    }

    var self = this;
    this.db.close(function(){
        delete self.db;
        if (callback) {
            callback();
        }
    });
};
/**
 * Process are query posted to the server.
 *
 * @param req
 *            the request object (from express)
 * @param res
 *            the response object (from express)
 */
QueryServer.prototype.postQuery = function(req, res) {
  var timestmap = Date.now();
  var query = req.body;

  console.log("duration: ", Date.now() - timestmap);
};

/**
 * Export the server
 */
module.exports.start = function(options, callback){
  var server = new QueryServer(options);

    server.start(function(svr){
        if (callback) {
            callback(svr);
        }
    });

  return server;
};
