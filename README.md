# @neezer/exit

> A helper to exit your application cleanly when SIGNAL is received.

[![Build Status](https://travis-ci.org/neezer/node-exit.svg?branch=master)](https://travis-ci.org/neezer/node-exit)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

**Example**:

Break down the component pieces of your application that need to gracefully exit
into event emitters. Pass these event emitters to `exit` to wait for all of them
to report a successful exit before shutting down the main application.

So, let's say you have a web app that is connected to a database and RabbitMQ. There are three component pieces to this application that need to be gracefully shutdown:

1. The HTTP server
1. The database connection pool
1. The RabbitMQ client

In some cases, the instance of your client or server is already an event emitter. If so, you can define your handlers directly on the same object:

```js
// file: httpServer.js

import { INITIATE_EXIT, COMPLETE_EXIT } from "@neezer/exit";
import { createServer } from "http";

const server = createServer(/* ... */);

server.on(INITIATE_EXIT, () => {
  server.close();
});

server.on("close", () => {
  server.emit(COMPLETE_EXIT);
});

export default server;
```

In some cases, you need to wrap the client/server interface in an EventEmitter yourself:

```js
// file: db.js

import { INITIATE_EXIT, COMPLETE_EXIT } from "@neezer/exit";
import pgClient from "./pgClient";
import { EventEmitter } from "events";

const client = pgClient(/* ... */);
const status = new EventEmitter();

status.on(INITIATE_EXIT, () => {
  client.close().then(() => {
    status.emit(COMPLETE_EXIT);
  });
});

export default status;
```

Then—in your top-level entry file—you can pass these event emitters to exit:

```js
// file: app.js

import { exit } from "@neezer/exit";
import http from "./httpServer";
import db from "./db";
import amqp from "./amqp";

exit(http, db, amqp);
```

Exit will configure listeners on the main Node thread for SIGINT & SIGKILL, then
will emit `INITIATE_EXIT` on each of the provided event emitters above, and will
wait for each of them to emit `COMPLETE_EXIT` after a certain period of time.
When it collects all the completed events, it will exit the main process
cleanly.

If one of the child pieces does not exit cleanly or times out, the library will
exit the main application thread with a status code of `1`.
