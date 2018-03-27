

# Super Logger

An NPM logging module that has an API to list and search logs for Node JS quicktext applications (aka RT & CB) plus a real time logging on the console. The API endpoints can be used for the monitoring system (developed on a later stage).

You can check the blueprint docs [here](https://docs.google.com/document/d/14yhGJDdrpyrpfUhlv2IQhqKwPftO5VA_YBvWIHJoFkY/edit?usp=sharing).

----------
### Table of contents

* [Getting Started](#getting-started)
  * [Prerequisites](#prerequisites)
  * [How to Install](#how-to-install)
  * [Set env](#set-env)
* [Docs](#docs)
  * [Init Logger](#init-logger)
  * [Levels and console colors](#levels-and-console-colors)
  * [Log types](#log-types)
  * [Pre-existing context](#pre-existing-context)
  * [Base log](#base-log)
  * [Logblock log](#logblock-log)
  * [Express logging](#express-logging)
  * [Request logging](#request-logging)
	  * [callRequestLogging](#callrequestlogging)
	  * [endRequestLogging](#endrequestlogging)
  * [Websocket logging](#websocket-logging)
  * [Mail Logging](#mail-logging)
  * [Logging API](#logging-api)
* [Todos](#todos)



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
you have to add *LOG_LEVEL* & *DB_LOG_LEVEL* & optionaly *MAIL_LOG_LEVEL* to your environment.

LOG_LEVEL is relevant to the lowest log level you'll see in your console.
DB_LOG_LEVEL is relevant to the lowest log level you'll save in your database.
MAIL_LOG_LEVEL is relevant to the lowest log level you'll receive log emails.
These are the levels you can state [here](#levels-and-console-colors).

Exemple: If you set your DB_LOG_LEVEL to *notice* you'll not save logs with *debug* & *info* levels.

## Docs
### Init Logger
Create a new instance and pass the database options to the init methode. The db and logDir properties are required.
Logger is a singleton class. The init method should be called only once on your whole project. Preferably in your entry file (index.js or whatever you named it).

```
const Logger = require('super-logger');
logger = new Logger();
logger.init({
  api: {
    port: 3015,
    logPrefix: '/logs',
  },
  db: "mongodb://localhost/my_database",
  logDir: './logs',
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
> **Note:**

> We used [winston-mongodb](https://github.com/winstonjs/winston-mongodb) as our mongodb transport and personalized it to our module by changing the log and query methods and by making it compatible to winston v3.
> The implementation and initialization is still the same.

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
- [BASE](#base-log): 0 -> basic logging
- [REST_SERVER](#express-logging): 1 -> morgan like logging but cooler
- [REST_CLIENT](#request-logging): 2 -> requests logging
- [WS](#websocket-logging): 3 -> ws event calls logging

You can access log types as following:
```
console.log(logger.logTypes);
```

### Pre-existing context:
We use these context. But you can add your own as you please:
- GENERAL: default value
- REQUEST: for logs on api or url requests
- EXPRESS: for logs on express route calls
- WEBSOCKET: for logs on websocket (socket.io) event calls
- TEST: for logs generated by the test command (do not use).

### Base log:
Depending on the level you want to use you just need to call the level method name.
The source and context fields are not required.
```
textError = "hello %s!";
value = "world";
objectError = {x: 2};
Object.assign(objectError, {
  context: "MY_CONTEXT",
  source: "CLIENT_SIDE"
})
logger.Log.error(textError, value, objectError);
//error: hello world! {x: 2} {context: "MY_CONTEXT", source: "CLIENT_SIDE"}

logger.Log.info("Yo %s!", "superman");
//info: Yo superman!

logger.Log.emergency(textError, value, {z: 3});
//emergency: hello world! {x: 2} {context: "GENERAL"}
```

### Logblock log
You can collect multiple logs in one logblock. It can be very useful if you want to follow a process.
All logs of the same logblock will have a logblock name and may have the same context and source if specified on the constructor.
If no logblock name is specified on the constructor, an auto generated logblock name format will be *[methodName|functionName|fileName]-[logblockId]*.
```
function myFunction () {
	let logblock = new logger.Logblock();
	logblock.info("hey");
	logblock.info("it's", {context: "MY_CONTEXT"});
	logblock.error("superman!", {source: "MY_SOURCE"});
}
myFunction();

//info: hey {context: "GENERAL", logblock: "myFunction-123456"}
//info: it's {context: "MY_CONTEXT", logblock: "myFunction-123456"}
//error: it's {context: "GENERAL", source: "MY_SOURCE", logblock: "myFunction-123456"}

function myFunction () {
	let logblock = new logger.Logblock("test");
	logblock.info("hey");
}
myFunction();

//info: hey {context: "GENERAL", logblock: "test-123456"}

function myFunction () {
	let logblock = new logger.Logblock({
		name: "test",
		context: "MY_LOGBLOCK_CTX",
		source: "MY_SOURCE_CTX",
	});
	logblock.info("hey");
	logblock.info("it's", {context: "MY_CONTEXT"});
	logblock.error("superman!", {source: "MY_SOURCE"});
}
myFunction();

//info: hey {context: "MY_LOGBLOCK_CTX", source: "MY_SOURCE_CTX", logblock: "test-123456"}
//info: it's {context: "MY_CONTEXT", source: "MY_SOURCE_CTX", logblock: "test-123456"}
//error: it's {context: "MY_LOGBLOCK_CTX", source: "MY_SOURCE", logblock: "test-123456"}
```

### Express logging
Add the middleware of super-logger to your express api to get our cool well detailed logging.
```
const = bodyParser = require('body-parser');
let app = express();
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());
app.use(logger.expressLogging());
```
On each call on your express api you'll have a block of log with the following settings:
- logblock: [{url}-{method}-{uid}]
- context: *EXPRESS*
- type: 1 (REST_SERVER = 1, click [here](#log-types))

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
- url, methode, query, body sent with the [*callRequestLogging*](#callrequestlogging) method.
- status, body, error received with the [*endRequestLogging*](#endrequestlogging) method.

If the body response is an object, array or string it will be saved in your log content.

If the body response is in a html format, it will be saved in a html file under your log directory. The file name will be saved in your log content.  You can easily access these files on your browser on this url: /[logPrefix]/log-files/filename.html

You'll have a block of log with the following settings:
- logblock: [{url}-{method}-{uid}]
- context: *REQUEST*
- type: 2 (REST_CLIENT = 2, click [here](#log-types))

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
logger.Log.callRequestLogging(url, 'GET', {}, true);
request.get(url, (err, httpResponse, body) => {
  logger.Log.endRequestLogging(url, 'get', err, httpResponse, body, true, false);
});
```
In a logblock:
```
const request = require('request');
let url = "http://ip.jsontest.com/ ";
let logblock = new logger.Logblock();
logblock.callRequestLogging(url, 'GET', {}, true);
request.get(url, (err, httpResponse, body) => {
  logblock.endRequestLogging(url, 'get', err, httpResponse, body, true, false);
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
- type: 3 (WS = 3, click [here](#log-types))

### Mail Logging
You can receive mails from a certain level that you specify in your env var *MAIL_LOG_LEVEL*.
Set your mail settings in the init method as follow:
- transportOptions: options to create the email transporter
  - host: SMTP server hostname
  - port: SMTP port (default: 587 or 25)
  - auth: to your email server
    - username User for server auth
    - password Password for server auth
- to: The address(es) you want to send to. [required]
- from: The address you want to send from. (default: super-logger@[server-host-name])
- subject: Your mail subject
- html: set to true if you use html in your formatter, false by default.
- formatter: a method to format your email

```
  const formatter = (data) => {
    let msg = util.format(data.message, ...data.splat);
    let meta = data.meta;
    return '<b>'+ msg +'</b>'
  };
  logger.init({
    [...], //other settings
    mailSettings: {
      transportOptions: {
        host: 'smtp.mail.com',
        port: 456,
        auth: {
          user: 'my_mail@superlogger.com', // generated ethereal user
          pass: 'my_password'  // generated ethereal password
        }
      },
      to: 'imen.ammar@satoripop.com',
      from: 'postmaster@quicktext.im',
      subject: 'A mail subject',
      html: true, //false by default
      formatter: formatter // a method to format your mail
    }
  });
```

### Logging API
Our module provide two API endpoints to show logs. These 2 endpoints have a prefixed route that you can set or leave it with a default value "/".

You can pass your own express app as follow:
```
let app = express();

logger.init({
  logDir: './logs',
  api: {
    appExpress: app,
    logPrefix: '/logs',
  },
  ...
});
app.listen(3005);
```
Or you can just set the port the api will work on
```
logger.init({
  logDir: './logs',
  api: {
    port: 3000,
    logPrefix: '/logs',
  },
  ...
});
```
The two endpoints are:
- The first one ([PREFIX]/) shows all logs
- The second one ([PREFIX]/by-block) shows all logs grouped by logblock

The params you can pass on query to filter your logs:
- context
- logblock
- type
- level

The logs are paginated starting with page 0.

In case your app keeps crashing and you need to reach the log api you can run the script *standalone* to launch a standalone log api:
```
npm run standalone [PORT] [MONGO_DB_STRING] [LOG_PREFIX] [COLLECTION_NAME]

```


# Todos:
  - Create a logging interface
