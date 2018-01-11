/**
 * @module logger
 * @fileoverview logger class to create a logger instance
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */

// winston helpers
const { createLogger, format, transports, addColors, add } = require('winston');
const { combine, prettyPrint, colorize} = format;
// dependency modules
const ansi = require('chalk');
const moment = require('moment');
const shortid = require('shortid');
const _ = require('lodash');
const circular = require('circular');
const fs = require('fs');
const isHtml = require('is-html');
// our own modules
const winstonMongo = require('./transports/winston-mongodb').MongoDB;
const winstonConsole = require('./transports/winston-console');
const logTypes = require('./helpers/logTypes');
const {levels, lowestLevel, colors, levelFromStatus, levelFromResStatus} = require('./helpers/levelsSettings');
const server = require('./api/server');

let instance = null;
class Logger {
  constructor() {
    if (!instance) {
      this.logTypes = logTypes;
      instance = this;
    }
    return instance;
  }

  /**
   * init logger:
   * create winston logger with console & mongodb transports,
   * add wrapper functions for log levels
   * and add colors to log console levels
   * @param  {object} options logger mongo transport options
   */
  init (options){
    options = (options || {});

    //create a log directory
    if(!options.logDir){
      throw new Error("You need to specify a log directory in logDir property");
    }
    this.logDir = options.logDir;
    if (!fs.existsSync(this.logDir)){
      fs.mkdirSync(this.logDir);
    }

    this.options = options;
    this.level = process.env.LOG_LEVEL || lowestLevel;
    this.dbLevel = process.env.DB_LOG_LEVEL || lowestLevel;

    //create mongo transport
    const mongoTransport = new winstonMongo({
      level: this.dbLevel,
      db: this.options.db,
      options: this.options.options,
      username: this.options.username,
      password: this.options.password,
      keepAlive: 1000,
      safe: true,
      nativeParser: true,
      decolorize: true
    });
    this.dbTransport = mongoTransport;

    //create console transport
    const consoleTransport = new winstonConsole({
      level: this.level,
      format: combine(
        colorize(),
        prettyPrint(),
        format.splat(),
        format.simple()
      )
    });
    //create winston logger
    this.logger = createLogger({
      levels,
      transports: [
        //create console transport for logger
        consoleTransport,
        //create mongo transport for logger
        mongoTransport
      ]
    });

    //add level colors
    addColors({
      levels,
      colors
    });

    //launch express logging api
    server(this, options.api);

    //log uncaughtExceptions
    this.logExceptions();
  }

  /**
   * log uncaught exceptions
   */
  logExceptions() {
    process.once('uncaughtException', err => {
      this.logger.emergency('Server is down.', {
        context: "GENERAL",
        logblock: 'uncaughtException-' + shortid.generate(),
        err
      });
      process.exit(1);
    });
  }

  /**
   * expresse Middleware:
   * a Middleware for express to log called routes in a morgan style logging
   */
  expressLogging() {
    let level = levelFromStatus();
    const self = this;
    return (req, res, next) => {
      let currentUrl = req.originalUrl || req.url,
        startTime = new Date(),
        uid = shortid.generate();
      let logblock = `${req.url}-${req.method}-${uid}`;
      let logMeta = {
        context: "EXPRESS",
        type: this.logTypes.REST_SERVER,
        logblock
      };
      //log on call
      self.logger.info("EXPRESS CALL %s: %s", currentUrl, req.method, logMeta);

      //log params
      if(!_.isEmpty(req.params)){
        let logMetaParams = Object.assign({}, logMeta, req.params);
        self.logger.info("Params: ", logMetaParams);
      }

      //log query
      if(!_.isEmpty(req.query)){
        let logMetaQuery = Object.assign({}, logMeta, req.query);
        self.logger.info("Query: ", logMetaQuery);
      }

      //log body
      if(!_.isEmpty(req.body)){
        let logMetaBody = Object.assign({}, logMeta, req.body);
        self.logger.info("Body Request: ", logMetaBody);
      }else{
        self.logger.info("Body Request is empty ", logMeta);
      }
      let end = res.end;
      let x = self.logger;
      res.end = function (chunk, encoding) {
        //log response status and delay
        res.responseTime = (new Date()) - startTime;
        res.end = end;
        res.end(chunk, encoding);
        req.url = req.originalUrl || req.url;
        let statusColor = 'green';
        if (res.statusCode >= 500) statusColor = 'red';
        else if (res.statusCode >= 400) statusColor = 'yellow';
        else if (res.statusCode >= 300) statusColor = 'cyan';
        let msg = ansi.grey(`${req.method} ${req.url}`) +
          ansi[statusColor](` ${res.statusCode} `) +
          ansi.grey(`${res.responseTime}ms`);
        self.logger.log(level(req, res), msg, logMeta);
        //log response body
        if(!_.isEmpty(res.body)){
          let logMetaResponseBody = Object.assign({}, logMeta, res.body);
          self.logger.info("Response Body: ", logMetaResponseBody);
        }
      };
      next();
    };
  }

  /**
   * Log on a call request:
   * log instantly the called route with its params, query, body and method.
   * @param  {string}  url        url called
   * @param  {string}  method     method used
   * @param  {object}  form       body sent to request
   * @param  {boolean} [api=true] is the url called part of a private API
   */
  callRequestLogging(url, method, form, api = true){
    if(!url || !method){
      throw new Error("Url and method are required for your request logging.");
    }
    method = method.toUpperCase();
    let uid = shortid.generate();
    let urlName = (url.split('?'))[0]
      .replace(/(^\w+:|^)\/\//, '')
      .replace(/\//g, "-");
    let logblock = `${urlName}-${method}-${uid}`;
    let logMeta = {
      type: this.logTypes.REST_CLIENT,
      logblock,
      context: "REQUEST"
    };

    //log request call
    let apiCallMsg = "API ";
    let msg = "Request %s";
    if(api){
      msg = apiCallMsg + msg;
    }
    this.logger.info(msg, ansi.magenta(`${url}: ${method}`), logMeta);

    //log request query
    let queryString = (url.split('?'))[1];
    let query = queryString ? JSON.parse(
      '{"' + queryString.replace(/&/g, '","').replace(/=/g,'":"') + '"}',
      (key, value) => key===""?value:decodeURIComponent(value)
    ):{};
    if(!_.isEmpty(query)){
      let logMetaQuery = Object.assign({}, logMeta, {query});
      this.logger.info('Body request: ', logMetaQuery);
    }

    //log the request body
    if(!_.isEmpty(form)){
      let logMetaBody = Object.assign({}, logMeta, {form});
      this.logger.info('Body request: ', logMetaBody);
    }

  }

  /**
   * Log a request call response:
   * log after request the error, status and body response
   * @param  {string}  method       method used
   * @param  {object}  err          error on request
   * @param  {object}  httpResponse httpResponse
   * @param  {object}  body         body Response
   * @param  {boolean} [api=true]   is the url called part of a private API
   * @param  {boolean} [json=false] is the body response a json
   */
  endRequestLogging(url, method, err, httpResponse, body, api = true, json = false){
    if(!url || !method){
      throw new Error("Url and method are required for your request logging.");
    }
    method = method.toUpperCase();
    let uid = shortid.generate();
    let urlName = (url.split('?'))[0]
      .replace(/(^\w+:|^)\/\//, '')
      .replace(/\//g, "-");

    let logblock = `${urlName}-${method}-${uid}`;
    let logMeta = {
      type: this.logTypes.REST_CLIENT,
      logblock,
      context: "REQUEST"
    };
    //log request error
    if(!_.isEmpty(err)){
      let logMetaError = Object.assign({}, logMeta, {err});
      this.logger.error("Request fail on: ", logMetaError);
    } else {
      //log request call
      let level = levelFromResStatus(httpResponse.statusCode);
      let msg = api ? "%s API Response %s " : "%s Response %s ";
      let status = (err || httpResponse.statusCode >= 300 || httpResponse.statusCode < 200) ?
        ansi.red.bold(`[Error] ${httpResponse.statusCode}`) :
        ansi.green.bold(`[Success] ${httpResponse.statusCode}`);
      this.logger.log(level, msg, status, ansi.magenta(`${url}: ${method}`), logMeta);
      //log file containing html body
      if (isHtml(body)) {
        let data = body.toString();
        let path = `${this.logDir}/${uid}.html`;
        fs.writeFile(path, data, 'utf8', (rerr) => {
    			if (rerr) {
    				this.logger.error('Error on write error file', Object.assign({}, logMeta, {err: rerr}));
    			}
    		});
        this.logger.info("Body Response saved in a HTML file: %s", path, logMeta);
        //log body
      } else if (typeof body === "string") {
        if (json) {
          try {
            body = JSON.parse(body);
            let logMetaBody = Object.assign({}, logMeta, body);
            this.logger.info("Body Response", logMetaBody);
          } catch (e) {
            let logMetaBodyError = Object.assign({}, logMeta, {body});
            //log error if body can't be parsed to json object
            this.logger.error("Parsing body response to object fail: ", logMetaBodyError);
            this.logger.info("Body Response: %s", body, logMeta);
          }
        } else {
          this.logger.info("Body Response: %s", body.toString(), logMeta);
        }
      //log body if string or object
      } else if (typeof body === "object") {
        let logMetaBody = Object.assign({}, logMeta, { body: JSON.stringify(body, circular()) });
        this.logger.info("Body Response", logMetaBody);
      } else {
        body = body.toString();
        this.logger.info("Body Response: %s", body, logMeta);
      }
    }
  }

  /**
   * [logWS description]
   * @param  {object} io the io socket object
   */
  wsLogging(io){
    io.on('connection', (socket) => {
    	var me = socket;
  		var onevent = socket.onevent;
  		socket.onevent = function(packet) {
  			var args = packet.data || [];
  			onevent.call(this, packet); // original call
  			packet.data = ["*"].concat(args);
  			onevent.call(this, packet); // additional call to catch-all
  		};
  		socket.on('*', (e, data) => {
        let uid = shortid.generate();
        let logblock = `${e}-${uid}`;
        let logMeta = {
          type: this.logTypes.WS,
          logblock,
          context: "WEBSOCKET"
        };
  			this.logger.info("The event %s has been called!", ansi.cyan(e), logMeta);
        Object.assign(logMeta, {data});
        this.logger.info("Event Body: ", logMeta);
  		});
    });
  }

  /**
   * Mongo query to get saved logs
   * @param  {Object} [options={}] query options
   */
  listLog(options = {}){
    return new Promise ((resolve, reject) => {
      this.dbTransport.query(options, (err, results) => {
        if(err){
          reject(err);
        }else{
          resolve(results);
        }
      });
    });
  }


  //add wrapper functions for levels
  debug (...args) {
    return this.logger.debug(...args);
  }
	info (...args) {
    return this.logger.info(...args);
  }
	notice (...args) {
    return this.logger.notice(...args);
  }
	warning (...args) {
    return this.logger.warning(...args);
  }
	error (...args) {
    return this.logger.error(...args);
  }
	critical (...args) {
    return this.logger.critical(...args);
  }
	alert (...args) {
    return this.logger.alert(...args);
  }
	emergency (...args) {
    return this.logger.emergency(...args);
  }
}

module.exports = Logger;
