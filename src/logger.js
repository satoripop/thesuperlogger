/**
 * @module logger
 * @fileoverview logger class to create a logger instance
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */

// winston helpers
const { createLogger, format, transports, addColors, add } = require('winston');
const { combine, prettyPrint, colorize} = format;
const winstonMongo = require('database/winston-mongodb').MongoDB;
const logTypes = require('database/logTypes');
// dependency modules
const ansi = require('chalk');
const moment = require('moment');
const shortid = require('shortid');
const _ = require('lodash');
const fs = require('fs');
const isHtml = require('is-html');
// our own modules
const {levels, lowestLevel, colors, levelFromStatus, levelFromResStatus} = require('levelsSettings');


let instance = null;
class Logger {
  constructor() {
    if (!instance) {
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

    this.logger = createLogger({
      levels,
      transports: [
        //create console transport for logger
        new (transports.Console)({
          level: this.level,
          format: combine(
            colorize(),
            prettyPrint(),
            format.splat(),
            format.simple()
          )
        }),
        //create mongo transport for logger
        new winstonMongo({
          level: this.dbLevel,
          db: this.options.db,
          options: this.options.options,
          username: this.options.username,
          password: this.options.password,
          decolorize: true
        })
      ]
    });
    //add level colors
    addColors({
      levels,
      colors
    });

    //add wrapper functions for levels
    for(let level in levels){
      Logger.prototype[level] = (...args) => {
        return this.logger[level](...args);
      };
    }
  }

  /**
   * expresse Middleware:
   * a Middleware for express to log called routes in a morgan style logging
   * @return {[type]} [description]
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
        type: logTypes.REST_SERVER,
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
        self.logger.log(level(req, res), msg);

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
      type: logTypes.REST_CLIENT,
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
      type: logTypes.REST_CLIENT,
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
      let status = (err || httpResponse.statusCode != 200) ? ansi.red.bold('[Error]') : ansi.green.bold('[Success]');
      this.logger.log(level, msg, status, ansi.magenta(`${url}: ${method}`), logMeta);
      //log file containing html body
      if (isHtml(body)) {
        let data = body.toString();
        let path = `${this.logDir}/${uid}.html`;
        fs.writeFile(path, data, 'utf8', function(rerr) {
    			if (rerr) {
    				return logger.error(rerr, logMeta);
    			}
    		});
        this.logger.info("Body Response saved in a HTML file: %s", path, logMeta);
      //log body
      } else if (typeof body == "string") {
        if (json){
          try {
            body = JSON.parse(body);
            let logMetaBody = Object.assign({}, logMeta, body);
            this.logger.info("Body Response", logMetaBody);
          } catch (e) {
            let logMetaBodyError = Object.assign(logMeta, body);
            //log error if body can't be parsed to json object
            this.logger.error("Parsing body response to object fail: ", logMetaBodyError);
            this.logger.info("Body Response: %s", body, logMeta);
          }
        }else{
          this.logger.info("Body Response: %s", body, logMeta);
        }
      //log body if string or object
      } else if (typeof body === 'object') {
        let logMetaBody = Object.assign({}, logMeta, body);
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
          type: logTypes.WS,
          logblock,
          context: "WEBSOCKET"
        };
  			this.logger.info("The event %s has been called!", ansi.cyan(e), logMeta);
        Object.assign(logMeta, data);
        this.logger.info("Event Body: ", logMeta);
  		});
    });
  }
}

module.exports = Logger;
