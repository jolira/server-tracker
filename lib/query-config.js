var config = require('./config');

module.exports = function(body, options, callback) {
  if (body.options) {
    config.save(body.options, function(options) {
      callback(options);
    });
    return;
  }
  config.load(options, function(options) {
    callback(options);
  });
}