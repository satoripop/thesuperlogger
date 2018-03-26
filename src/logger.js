/**
 * @module logger
 * @fileoverview logger class to create a logger instance
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */

// winston helpers
const { createLogger, format, addColors } = require('winston');
const { combine, prettyPrint, colorize} = format;
// dependency modules
const shortid = require('shortid');
const _ = require('lodash');
const fs = require('fs');
const EventEmitter = require('events');
const StackTrace = require('stack-trace');
// our own modules
const winstonMongo = require('./transports/winston-mongodb').MongoDB;
const winstonMail = require('./transports/winston-mail').Mail;
const winstonConsole = require('./transports/winston-console');
const logTypes = require('./helpers/logTypes');
const {levels, lowestLevel, colors, levelFromStatus} = require('./helpers/levelsSettings');
const server = require('./api/server');
const ansi = require('./helpers/ansi.js');
const Logblock = require('./logblock');
const Log = require('./log');


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
   * clear:
   * destroy logger on next instantiation
   */
	clear(_this) {
		let self = this || _this;
		//process.removeListener('uncaughtException', self.logExceptions);
		if (self.mailTransport) self.mailTransport.removeAllListeners();
		if (self.dbTransport) self.dbTransport.removeAllListeners();
		instance = null;
	}

	/**
   * init logger:
   * create winston logger with console, mongodb and mail transports,
   * and add colors to log console levels
   * @param  {object} options logger mongo transport options
   */
	init (options){
		this.options = (options || {});

		//create a log directory
		if(!this.options.logDir){
			throw new Error('You need to specify a log directory in logDir property');
		}
		this.logDir = this.options.logDir;
		if (!fs.existsSync(this.logDir)){
			fs.mkdirSync(this.logDir);
		}

		this.level = process.env.LOG_LEVEL || lowestLevel;

		//create console transport
		const consoleTransport = new winstonConsole({
			level: this.level,
			format: combine(
				colorize(),
				prettyPrint(),
				format.splat(),
				format.simple()
			),
			handleExceptions: false,
		});
		this.consoleTransport = consoleTransport;
		let transports = [consoleTransport];

		//create mongo transport if wanted
		if(!_.isEmpty(this.options.dbSettings)) {
			this.dbLevel = process.env.DB_LOG_LEVEL || lowestLevel;

			let dbSettings = this.options.dbSettings;

			const mongoTransport = new winstonMongo({
				level: this.dbLevel,
				db: dbSettings.db,
				options: dbSettings.options,
				keepAlive: 1000,
				safe: true,
				nativeParser: true,
				decolorize: true,
				handleExceptions: false,
			});
			this.dbTransport = mongoTransport;

			transports.push(mongoTransport);
		}

		//create email transport if wanted
		if(!_.isEmpty(this.options.mailSettings)) {
			this.mailLevel = process.env.MAIL_LOG_LEVEL || lowestLevel;

			Object.assign(this.options.mailSettings, {
				level: this.mailLevel,
				handleExceptions: false,
			});
			const mailTransport = new winstonMail(this.options.mailSettings);
			this.mailTransport = mailTransport;

			transports.unshift(mailTransport);
		}
		//create winston logger
		this.logger = createLogger({
			levels,
			transports,
			exitOnError: false,
		});
		//add level colors
		addColors({
			levels,
			colors,
		});

		//set log
		let log = new Log();
		this.Log = log;
		//set logblock
		this.Logblock = Logblock;


		if (this.dbTransport && process.env.APP_ENV != 'test') {
			//launch express logging api
			server(this, this.options.api);
		}

		//log uncaughtExceptions
		if(process.env.APP_ENV != 'test')
			process.once('uncaughtException', err => this._logExceptions(this, err));
	}

	/**
   * log uncaught exceptions
   */
	_logExceptions(self, err) {
		console.log(err);
		let noMongoLog = false;
		if (err instanceof Error && err.name == 'MongoError') {
			noMongoLog = true;
		}
		let msg = 'Server is down.';
		let logExpected = 1;
		let logEmitted = 0;
		let exitEmitter = new EventEmitter();
		exitEmitter.on('exit', () => {
			if(logEmitted == logExpected)
				process.exit(1);
		});

		if (self.mailTransport) {
			logExpected++;
			self.mailTransport.on('logged', info => {
				console.log('super-logger: mailTransport message', info);
				if (info.message == msg) {
					logEmitted++;
					process.nextTick(() => { exitEmitter.emit('exit'); });
				}
			});
		}
		if (self.dbTransport && !noMongoLog) {
			logExpected++;
			self.dbTransport.on('logged', info => {
				if (info.message == msg) {
					logEmitted++;
					process.nextTick(() => { exitEmitter.emit('exit'); });
				}
			});
		}

		self.logger.emergency(msg, {
			context: 'GENERAL',
			logblock: 'uncaughtException-' + shortid.generate(),
			err,
			noMongoLog,
		});

		self.consoleTransport.on('logged', info => {
			if (info.message == msg) {
				logEmitted++;
				process.nextTick(() => { exitEmitter.emit('exit'); });
			}
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
				context: 'EXPRESS',
				type: this.logTypes.REST_SERVER,
				logblock,
			};
			//log on call
			self.logger.info('EXPRESS CALL %s: %s', currentUrl, req.method, logMeta);
			//log params
			if (!_.isEmpty(req.params)) {
				let logMetaParams = Object.assign({}, logMeta, req.params);
				self.logger.info('Params: ', logMetaParams);
			}

			//log query
			if (!_.isEmpty(req.query)) {
				let logMetaQuery = Object.assign({}, logMeta, req.query);
				self.logger.info('Query: ', logMetaQuery);
			}

			//log body
			if (!_.isEmpty(req.body)) {
				let logMetaBody = Object.assign({}, logMeta, req.body);
				self.logger.info('Body Request: ', logMetaBody);
			} else {
				self.logger.info('Body Request is empty ', logMeta);
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
				self.logger.log(level(req, res), msg, logMeta);
				//log response body
				if(!_.isEmpty(res.body)){
					let logMetaResponseBody = Object.assign({}, logMeta, res.body);
					self.logger.info('Response Body: ', logMetaResponseBody);
				}
			};
			next();
		};
	}

	/**
   * log websocket event
   * @param  {object} io the io socket object
   */
	wsLogging(io){
		io.on('connection', (socket) => {
			let me = socket;
			let onevent = socket.onevent;
			socket.onevent = function(packet) {
				let args = packet.data || [];
				onevent.call(this, packet); // original call
				packet.data = ['*'].concat(args);
				onevent.call(this, packet); // additional call to catch-all
			};
			socket.on('*', (e, data) => {
				let uid = shortid.generate();
				let logblock = `${e}-${uid}`;
				let logMeta = {
					type: this.logTypes.WS,
					logblock,
					context: 'WEBSOCKET',
				};
				this.logger.info('The event %s has been called!', ansi.cyan(e), logMeta);
				Object.assign(logMeta, {data});
				this.logger.info('Event Body: ', logMeta);
			});
		});
	}

	/**
   * Mongo query to get saved logs
   * @param  {Object} [options={}] query options
   */
	_listLog(options = {}){
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


}

module.exports = Logger;
