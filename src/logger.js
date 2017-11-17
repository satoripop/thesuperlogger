/**
 * @module logger
 * @fileoverview logger class to create a logger instance
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */

// winston helpers
const { createLogger, format, transports, addColors, add } = require('winston');
const { combine, prettyPrint, colorize} = format;
const winstonMongo = require('../../winston-mongodb/lib/winston-mongodb').MongoDB;
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
      let coloredRes = {},
        currentUrl = req.originalUrl || req.url,
        startTime = new Date();
      // Manage to get information from the response too, just like Connect.logger does:
      let end = res.end;
      res.end = function (chunk, encoding) {
        res.responseTime = (new Date()) - startTime;
        res.end = end;
        res.end(chunk, encoding);
        req.url = req.originalUrl || req.url;
        // Palette from https://github.com/expressjs/morgan/blob/master/index.js#L205
        let statusColor = 'green';
        if (res.statusCode >= 500) statusColor = 'red';
        else if (res.statusCode >= 400) statusColor = 'yellow';
        else if (res.statusCode >= 300) statusColor = 'cyan';
        let expressMsgFormat = ansi.grey("{{req.method}} {{req.url}}") +
          " {{res.statusCode}} " +
          ansi.grey("{{res.responseTime}}ms");
        coloredRes.statusCode = ansi[statusColor](res.statusCode);
        var msgFormat = expressMsgFormat;
        // Using mustache style templating
        var template = _.template(msgFormat, {
          interpolate: /\{\{(.+?)\}\}/g
        });
        var msg = template({
          req: req,
          res: _.assign({}, res, coloredRes)
        });
        self.logger.log(level(req, res), msg);
      };
      next();
    };
  }

}

module.exports = Logger;
