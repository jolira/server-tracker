var mongodb = require('mongodb');
var replSet = new mongodb.ReplSetServers( [
    new mongodb.Server( "localhost", 27017, { auto_reconnect: true, read_secondary : true } )
  ]
);

console.log("replicas ", require("util").inspect(replSet, false, 10));
var db = new mongodb.Db('walmart-mobile', replSet);
console.log("open");
db.open(function(err, p_db) {
  if (err) {
    console.log("%j", err);
  }
  console.log("opened");
  process.exit(0);
})