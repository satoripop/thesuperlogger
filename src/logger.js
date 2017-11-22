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
const _ = require('lodash');
// our own modules
const {levels, lowestLevel, colors, levelFromStatus} = require('levelsSettings');


let instance = null;
class Logger {
  constructor() {
    if (!instance) {
      instance = this;
    }
    return instance;
  }

  init (options){
    options = (options || {});
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

  expressLogging() {
    let level = this.levelFromStatus();
    const self = this;
    return (req, res, next) => {
      let currentUrl = req.originalUrl || req.url,
        startTime = new Date(),
        tmp = startTime.getTime();
      let logblock = `${req.url}-${req.method}-${tmp}`;
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

}

module.exports = Logger;
