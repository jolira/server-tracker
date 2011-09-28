server-tracker
=======================================================================================================================

Keeping track of servers is always a very important, but typically challenging task. There are many companies out there are glad to take your metrics and display it back for you, for a price.

The idea of this tool is to collect metrics as well as logs from a large number of servers as well as front-ends such as iPhone or Android apps as well as web apps running in clients.

Main features are:

* Collection of "events", "metrics", and log records and storing them in MongoDB.
* Retrieving JMX data from java servers using the [jolokia](http://www.jolokia.org/) JXM bridge
* Rendering arbitrary wonderful graphs that tracks customer behavior, server performance, response times, etc.

Install & Run
-----------------------------------------------------------------------------------------------------------------------

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
```

The startup process fails miserably unless the tracker can connect to a mongo instance on the local server. Configuration data is loaded from there. In order to connect to a different instance, one has to start the server tracker directly using:

```
npm start server-tracker
```

By default, the tracker lookf for a configuration file called ``${HOME}/.server-tracker.json``.
This file has to contain valid json that identifies the replication set to use, as in:

```
{
    "listenPort" : 3080,
    "mongo": {
        "replica-set": [
            {
                "server": "mongo00.jolira.com",
                "port": 27017
            },
            {
                "server": "mongo01.jolira.com",
                "port": 27017
            },
            {
                "server": "mongo02.jolira.com",
                "port": 27017
            }
        ],
        "database": "mobile-app"
    },
    "seeds": [
            {
                "server": "tracker00.jolira.com",
                "port": 3080
            },
            {
                "server": "tracker01.jolira.com",
                "port": 3080
            },
            {
                "server": "tracker02.jolira.com",
                "port": 3080
            }
        ]
}
```

Submitting Data
-----------------------------------------------------------------------------------------------------------------------

For the impatient, source code that shows how to submit data to the server-tracker can be found in
[examples/submitEvents](https://raw.github.com/jolira/server-tracker/master/examples/submitEvents).

Client have to ``POST`` valid JSON containing arrays of event ``events`` and ``logs`` to ``/submit/events``. In addition
``events`` and ``logs`` the posted structure should also contain any properties that should common to all ``events`` and
``logs`. Here is an example:

```
{
    "timestamp": 1317249723532,
    "source": "shopping.jolira.com",
    "visitor": "a815ee70-df67-11e0-9572-0800200c9a66",
    "session": "aaebf7d5-c80f-4c04-a2b2-e0de618a364d",
    "events": [
        {
            "type": "shopping",
            "timestamp": 1317249721542,
            "duration": 1200,
            "metrics": {
                "remotePerformance": [
                    {
                        "timestamp": 1316068487831981,
                        "duration": 200,
                        "url": {
                            "protocol": "http",
                            "host": "iphone.jolira.com",
                            "port": "8081",
                            "path": "/query/item",
                            "params": {
                                "product": 73212272,
                                "mode": "summary"
                            }
                        }
                    }
                ]
            }
        }
    ],
    "logs": [
        {
            "timestamp": 1317249793456,
            "message": "socket error",
            "level": "ERROR"
        }
    ]
}
```

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

### ``timeestamp``

The ``timeestamp`` can be set on the server to indicate when the server submitted the event. If provided, it will be stored with every event as the ``submitTimestamp`` property. The same is true for logs. If the ``timetstamp`` is set this timestamp will be added as the ``submitTimestamp`` to every log record that was submitted.

### ``source``

The ``source`` property is a convenient way to identify the source of the event without having to explicityly set it for every event. If the source property is
available it is added to every event that was submitted, but does not have a source property. The source should identify the source of the event (such as the hostname of the server or device that created the event object). The  ``source`` property is used the same way with all entries in ``logs``. If present,  it will be added as the value of the ``source`` property for every log record that does not have one.

### ``events``

The ``events`` property the array of events that should be added to the database. Every event should have the following structure:

```
{
  "type" : <>
  "timetamp" : <time the event started ("unix time")>,
  "duration" : <the duration of the event>,
  "visitor" : <>,
  "session" : <>
  "source" : <self identification of the server>,
  "metrics" : [ <metric1>, <metric2>, <metric3>, ... ]
}
```


### ``logs``

