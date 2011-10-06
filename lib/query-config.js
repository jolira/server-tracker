var config = require('./config');

module.exports = function(options, callback) {
  config.load(options, function(options) {
    callback(options);
  });
}