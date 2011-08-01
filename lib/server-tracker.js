/*
 * Copyright 2011 jolira
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at http://www.apache.org/licenses/LICENSE-2.0. Unless required by
 * applicable law or agreed to in writing, software distributed under the
 * License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS
 * OF ANY KIND, either express or implied. See the License for the specific
 * language governing permissions and limitations under the License.
 */
var util = require('util');
var cp = require('child_process');

function toString(cmd) {
    if (!cmd instanceof Array) {
        return cmd.toString();
    }

    var result = "";

    for ( var idx in cmd) {
        var arg = cmd[idx];

        if (result.length > 0) {
            result += ' ';
        }

        result += arg;
    }

    return result;
}

function Cache(hostmaker, hostnames) {
    this.hostmaker = hostmaker;
    this.hostnames = hostnames;
    this.cached = {};
}

Cache.prototype.getHost = function(name) {
    if (!name) {
        return undefined;
    }

    var cached = this.cached[name];

    if (cached) {
        return cached;
    }

    var host = this.hostmaker(this, name);

    this.cached[name] = host;

    return host;
};

Cache.prototype.getHosts = function() {
    var result = [];

    for ( var idx in this.hostnames) {
        var hostname = this.hostnames[idx];
        var host = this.getHost(hostname);

        result.unshift(host);
    }

    return result;
};

function Host(hostCache, user, password, hostname, host, gateway) {
    host = host || {};

    this.hostCache = hostCache;
    this.user = host.user || user;
    this.password = host.password || password;
    this.hostname = host.hostname || hostname;

    var gate = host.gateway || (gateway == hostname ? undefined : gateway);

    this.gateway = hostCache.getHost(gate);
}

Host.prototype.run = function(entry) {
    this.handlers = this.handlers || [];
    this.handlers.unshift(entry.handler);

    this.ssh.stdin.write(entry.cmd);
    this.ssh.stdin.write('\n');
};

Host.prototype.execute = function(cmd, handler) {
    if (!this.ssh) {
        this.connect(this);
    }

    var entry = {
        "cmd" : toString(cmd),
        "hander" : handler
    };

    if (this.pending) {
        this.pending.unshift(entry);
        return;
    }

    this.run(entry);
};

Host.prototype.getDestination = function() {
    if (!this.user) {
        return this.hostname;
    }

    return this.user + '@' + this.hostname;
};

Host.prototype.spawn = function(data) {
    var dest = this.getDestination();

    if (this.password) {
        return cp.spawn('ssh', [ '-tt', dest ]);
    }

    return cp.spawn('sshpass', [ '-p' + this.password, 'ssh', '-tt', dest ]);
};

Host.prototype.handleError = function(data) {
    process.stderr.write(data);
};

Host.prototype.handleOut = function(data) {
    process.stdout.write(data);

    if (this.handlers.length > 0) {
        this.handlers[this.handlers.length - 1](undefined, data);
    }
};

Host.prototype.connect = function(actual) {
    if (this.gateway) {
        this.gateway.connect(actual);
        var dest = this.getDestination();

        if (this.password) {
            var self = this;

            actual.handlers.unshift(function(error, data) {
                if (!data) {
                    return;
                }

                var str = data.toString();

                if (str.match(/assword:/)) {
                    actual.ssh.stdin.write(self.password + '\n');
                    actual.handlers.shift();
                }
            });
        }

        actual.ssh.stdin.write("ssh -tt " + dest + "\n");
        return;
    }

    actual.handlers = [];
    actual.ssh = this.spawn();
    actual.ssh.stdout.on('data', function(data) {
        actual.handleOut(data);
    });
    actual.ssh.stderr.on('data', function(data) {
        actual.handleError(data);
    });
};

function Broadcaster(servers) {
    var password = servers.password;
    var user = servers.user;
    var gateway = servers.gateway;
    var hosts = servers.hosts ? servers.hosts : {};
    var hostnames = Object.keys(hosts);
    var hostMaker = function(cache, name) {
        return new Host(cache, user, password, name, hosts[name], gateway);
    };

    this.hostCache = new Cache(hostMaker, hostnames);
}

Broadcaster.prototype.execute = function(args) {
    var hosts = this.hostCache.getHosts();

    for ( var idx in hosts) {
        var host = hosts[idx];

        host.execute(args);
    }
};

module.exports = {
    /**
     * Connect to all defined servers.
     * 
     * @param servers
     *            (Object) definition of servers
     * @return the Broadcaster object
     */
    connect : function(servers) {
        return new Broadcaster(servers);
    }
};
