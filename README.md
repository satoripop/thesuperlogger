
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

### Init Logger
Create a new instance and pass the database options to the init methode. The db property is required.
Logger is a singleton class. The init method should be called only once on your whole project. Preferably in your entry file (index.js or whatever you named it).

```
const Logger = require('super-logger');
logger = new Logger();
logger.init({
  db: "mongodb://localhost/my_database",
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
### How to log:
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