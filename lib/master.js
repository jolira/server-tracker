var _ = require('underscore');
var http = require('http');

function Master(path, seeds, id) {
  this.timestamp = Date.now();
  this.peers = seeds;
  this.path = path;
  this.id = id;
}

function processRemote(self, body, leftToCheck, alreadyChecked, callback) {
    self.peers = _.union(self.peers, body.peers);
    var newNotYetChecked = _.difference(body.peers, alreadyChecked);
    leftToCheck = _.union(leftToCheck, newNotYetChecked);
    if (body.id === self.id || body.master === self.id) {
        findMaster(self, leftToCheck, alreadyChecked, callback);
    }
    else if (body.timestamp <= self.timestamp) {
        callback(body.id);
    }
    else if (body.master) {
        findRemoteMaster(self, body.master, leftToCheck, alreadyChecked, callback);
    } else {
        findMaster(self, leftToCheck, alreadyChecked, callback);
    }
}

function findRemoteMaster(self, remote, leftToCheck, alreadyChecked, callback) {
    alreadyChecked.push(remote);
    var addr = remote.split(':');
    var message = {
        "id" : self.id,
        "timestamp" : self.timestamp,
        "peers" : self.peers
    };
    var req = http.request({
        host: addr[0],
        port: addr[1],
        path: self.path,
        method: 'POST',
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    }, function(res) {
        var buffer = "";
        res.on('data', function(chunk) {
            buffer += chunk;
        });
        res.on('end', function(chunk) {
            processRemote(self, JSON.parse(buffer), leftToCheck, alreadyChecked, callback);
        });
    });

    req.on('error', function(e) {
        findMaster(self, leftToCheck, alreadyChecked, callback);
    });
    req.write(JSON.stringify(message));
    req.end();
}

function findMaster(self, leftToCheck, alreadyChecked, callback) {
    for(;;) {
        var remote = _.first(leftToCheck);

        if (!remote) {
            return callback(self.id);
        }

        leftToCheck = _.rest(leftToCheck);

        if (_.indexOf(alreadyChecked, remote) === -1) {
            return findRemoteMaster(self, remote, leftToCheck, alreadyChecked, callback);
        }
    }
    _
}

Master.prototype.postStatus = function(req, res) {
    var body = req.body;

    if (!this.master && body.timestamp < this.timestamp) {
        this.master = body.id;
    }

    var self = this;
    self.peers = _.union(self.peers, body.peers);
    res.send({
        "id" : self.id,
        "peers" : self.peers,
        "timestamp" : self.timestamp,
        "master" : self.master
    });
};

Master.prototype.stop = function() {
  // nothing yet
};

Master.prototype.start = function(callback) {
  callback(this);
};

Master.prototype.isMaster = function(callback) {
  if (this.id === this.master) {
    return callback(true);
  }

  var leftToCheck = this.peers.slice(0);
  var alreadyChecked = [ this.id ];
  var self = this;

  findMaster(self, leftToCheck, alreadyChecked, function(master) {
    self.master = master;

    callback(self.master === self.id);
  });
};


module.exports.start = function(path, seeds, id, callback) {
  var server = new Master(path, seeds, id);
  server.start(function(svr) {
    if (callback) {
      callback(svr);
    }
  });
  return server;
};
