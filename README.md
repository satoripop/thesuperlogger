
# Super Logger

An NPM logging module that has an API to list and search logs for Node JS quicktext applications (aka RT & CB) plus a real time logging on the console. The API endpoints can be used for the monitoring system (developed on a later stage). 

You can check the blueprint docs [here](https://docs.google.com/document/d/14yhGJDdrpyrpfUhlv2IQhqKwPftO5VA_YBvWIHJoFkY/edit?usp=sharing).

----------
### Table of contents

[TOC]

----------

## Getting Started
### Prerequisites

install mongo and create a database.

### How to Install

Install all npm packages.
```
npm install
```
### SET env
you have to add *LOG_LEVEL* & *DB_LOG_LEVEL* to your environment.

LOG_LEVEL is relevant to the lowest log level you'll see in your console.
DB_LOG_LEVEL is relevant to the lowest log level you'll save in your database. 
These are the levels you can state [here](### Levels and console colors).

Exemple: If you set your DB_LOG_LEVEL to *notice* you'll not save logs with *debug* & *info* levels. 

## Docs
### Init Logger
Create a new instance and pass the database options to the init methode. The db and logDir properties are required.
Logger is a singleton class. The init method should be called only once on your whole project. Preferably in your entry file (index.js or whatever you named it).

```
const Logger = require('super-logger');
logger = new Logger();
logger.init({
  db: "mongodb://localhost/my_database",
  logDir: './logs',
  username: "my_username",
  password: "my_password",
  options: {
    poolSize: 2,
    autoReconnect: true
  }
});
```
To reuse the logger on different files, you just need to call the logger as follow:
```
const Logger = require('super-logger');
logger = new Logger();
```
### Levels and console colors:
The levels of Super Logger are:
- debug (green on Console)
- info (blue on Console)
- notice (grey on Console)
- warning (yellow on Console)
- error (red on Console)
- critical (red on Console)
- alert (red on Console)
- emergency (red on Console)

### Log types:
We have a specific kind of logging for each of these types:
- [BASE](### Base log): 0 -> basic logging
- [REST_SERVER](### Express logging): 1 -> morgan like logging but cooler
- [REST_CLIENT](### Request logging): 2 -> requests logging
- [WS](### Websocket logging): 3 -> ws event calls logging

### Pre-existing context:
We use these context. But you can add your own as you please:
- REQUEST: for logs on api or url requests
- EXPRESS: for logs on express route calls
- WEBSOCKET: for logs on websocket (socket.io) event calls

### Base log:
Depending on the level you want to use you just need to call the level method name.
Each log has a context and is part of a logblock. Thus these fields are mandatory.
The source field is not required.
```
textError = "hello %s !";
value = "world";
objectError = {x: 2};
Object.assign(objectError, {
  context: "MY_CONTEXT",
  logblock: "test_block",
  source: "CLIENT_SIDE"
})
logger.error(textError, value, objectError);
//error: hello world ! {x: 2}
```

### Express logging
Add the middleware of super-logger to your express api to get our cool well detailed logging.
```
let app = express();
app.use(logger.expressLogging());
```
On each call on your express api you'll have a block of log with the following settings:
- logblock: [{url}-{method}-{timestamp}] 
- context: *EXPRESS*
- type: 1 (REST_SERVER = 1, click [here](### Log types)) 

The log block will contain the following logs:
- A log to inform you when the route was called (level info)
- A log with the params if they exist (level info)
- A log with the query if it exists (level info)
- A log with the body request (level info)
- A log when the response in send with the status code and delay on ms (level depending on status code)
- A log with the response body if it exists (level info).

For each status code we have a different level:
- status code >= 100 -> debug
- status code >= 400 -> warning
- status code >= 500) -> error

### Request logging:
Whenever you make a request to an API or route you can log its:
- url, methode, query, body sent with the [*callRequestLogging*](#### callRequestLogging) method.
- status, body, error received with the [*endRequestLogging*](#### endRequestLogging) method.

If the body response is an object, array or string it will be saved in your log content.

If the body response is in a html format, it will be saved in a html file under your log directory. The file name will be saved in your log content.

You'll have a block of log with the following settings:
- logblock: [{url}-{method}-{uid}] 
- context: *REQUEST*
- type: 2 (REST_CLIENT = 2, click [here](### Log types)) 

#### callRequestLogging
```
callRequestLogging(url, method, form, api)
```
- url : path called (string) -> required
- method: method used (string) -> required
- form: body sent (object)
- api: to differentiate your API requests and get in you log content "API Request" instead of "Request", set to true. (boolean - default true)

#### endRequestLogging
```
endRequestLogging(url, method, err, httpResponse, body, api, json )
```
- url : path called (string) -> required
- method: method used (string) -> required
- err: error on request (object or string)
- httpResponse: response with *statusCode* (object)
- api: to differentiate your API response and get in you log content "API Response" instead of "Response", set to true. (boolean - default true)
- json: if you expect a json response, set to true (boolean - default false)


```
const request = require('request');
let url = "http://ip.jsontest.com/ ";
logger.callRequestLogging(url, 'GET', {}, true);
request.get(url, (err, httpResponse, body) => {
  logger.endRequestLogging(url, 'get', err, httpResponse, body, true, false);
});
```
### Websocket logging
Our module works with socket.io. On each web socket call, we log the event name and the data passed. 

To init the web socket logging, do as following:
```
io = require('socket.io')(3000);
logger.wsLogging(io);
io.on('connection', (socket) => {
  socket.on('test', data => {
    // event handling
  });
});
```
You'll have a block of log with the following settings:
- logblock: [{eventName}-{uid}] 
- context: *WEBSOCKET*
- type: 3 (WS = 3, click [here](### Log types)) 