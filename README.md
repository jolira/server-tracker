server-tracker
================

Keeping track of servers is always a very important, but typically challenging task. There are many companies out there are glad to take your metrics and display it back for you, for a price.

The idea of this tool is to collect metrics as well as logs from a large number of servers as well as front-ends such as iPhone or Android apps as well as web apps running in clients.

Main features are:

* Collection of "events", "metrics", and log records and storing them in MongoDB.
* Retrieving JMX data from java servers using the [jolokia]{http://www.jolokia.org/} JXM bridge
* Rendering arbitrary wonderful graphs that tracks customer behavior, server performance, response times, etc.

Install & Run
----------------

In order to be able to install and execute the server-tracker, one must have both ``node.js`` and ``npm`` installed. There are many ways to get these two products install. One of them is to install them using [nvm]{https://github.com/creationix/nvm}:

```
git clone git://github.com/creationix/nvm.git ~/.nvm
. ~/.nvm/nvm.sh
nvm install v0.4.12
nvm alias default v0.4.12
```

In order for this to work one obviously need ``git`` as well as a compiler and other build essentials.

Once ``node.js`` and ``npm`` are availabe, the tracker can be installed using:

```
npm install server-tracker --mongodb:native
npm install server-tracker
```

Submitting Data
----------------
