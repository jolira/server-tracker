var openDB = require('../lib/db');

console.log("open");
openDB({ "replica-set": [ {
      "server": "localhost",
      "port": 27017
    }], "database": "walmart-mobile"
  }, function(db) {
  console.log("opened");
});
