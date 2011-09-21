server-tracker
================

Keeping track of servers is always a very important, but typically challenging task. There are many companies out there are glad to take your metrics and display it back for you, for a price.

The idea of this tool is to collect metrics as well as logs from a large number of servers as well as front-ends such as iPhone or Android apps as well as web apps running in clients.

Main features are:

* Collection of "events", "metrics", and log records and storing them in MongoDB.
* Retrieving JMX data from java servers using the [jolokia](http://www.jolokia.org/) JXM bridge
* Rendering arbitrary wonderful graphs that tracks customer behavior, server performance, response times, etc.

Install & Run
----------------

In order to be able to install and execute the server-tracker, one must have both ``node.js`` and ``npm`` installed. There are many ways to get these two products install. One of them is to install them using [nvm](https://github.com/creationix/nvm):

```
git clone git://github.com/creationix/nvm.git ~/.nvm
. ~/.nvm/nvm.sh
nvm install v0.4.12
nvm alias default v0.4.12
```

In order for this to work one obviously need ``git`` as well as a compiler and other build essentials. The [nvm](https://github.com/creationix/nvm) github page is one of the sources that explain how to install these problems.

Once ``node.js`` and ``npm`` are availabe, the tracker can be installed using:

```
npm install server-tracker --mongodb:native
npm install server-tracker
```

The startup process fails miserably unless the tracker can connect to a mongo instance on the local server. Configuration data is loaded from there. In order to connect to a different instance, one has to start the server tracker directly using:

```
node_modules/server-tracker/bin/server-tracker myconf.json
```

The ``myconf.json`` file has to contain valid json that identifies the replication set to use, as in:

```
{
  "mongo" : {
    "replica-set" : [{
      "server" : "mongo1.jolira.com",
      "port" : 27017
    }, {
      "server" : "mongo2.jolira.com",
      "port" : 27017
    }, {
      "server" : "mongo3.jolira.com",
      "port" : 27017
    }]
  }
}
```

Submitting Data
----------------

Once the server is running, data can be submitted using ``/submit/events``. If the server runs on localhsot, the data can be submitted using ``http://localhost:3080/submit/events`` as the url.


The data has to be posted to this url. The content of the post should contain both "events" and log messages, as in:

```
{
  "timetamp" : <time on server>,
  "source" : <self identification of the server>,
  "events" : [ <event1>, <event2>, <event3>, ... ],
  "logs" : [ <logRecord1>, <logRecord2>, <logRecord3>, ... ]
}
```

All properties are option, but at least the ``events`` or the ``logs`` field should be set, otherwise no action is taken.

The ``timetstamp`` can be set on the server to indicate when the server submitted the event. If provided, it will be stored with every event as the ``submitTimestamp`` property. The same is true for logs. If the ``timetstamp`` is set this timestamp will be added as the ``submitTimestamp`` to every log record that was submitted.

The ``source`` property is a convenient way to identify the source of the event without having to explicityly set it for every event. If the source property is
available it is added to every event that was submitted, but does not have a source property. The source should identify the source of the event (such as the hostname of the server or device that created the event object).

