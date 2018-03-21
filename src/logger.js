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
const chalk = require('chalk');
const supportsColor = require('supports-color');
const shortid = require('shortid');
const _ = require('lodash');
const circular = require('circular');
const fs = require('fs');
const isHtml = require('is-html');
const EventEmitter = require('events');
const StackTrace = require('stack-trace');
// our own modules
const winstonMongo = require('./transports/winston-mongodb').MongoDB;
const winstonMail = require('./transports/winston-mail').Mail;
const winstonConsole = require('./transports/winston-console');
const logTypes = require('./helpers/logTypes');
const {levels, lowestLevel, colors, levelFromStatus, levelFromResStatus} = require('./helpers/levelsSettings');
const server = require('./api/server');

let ansi = new chalk.constructor({level: 0});
if (supportsColor.stderr.has16m) {
	ansi = new chalk.constructor({level: 3});
} else if (supportsColor.stdout.has256) {
	ansi = new chalk.constructor({level: 2});
} else if (supportsColor.stdout) {
	ansi = new chalk.constructor({level: 1});
}

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
		if (this.dbTransport && process.env.APP_ENV != 'test') {
			//launch express logging api
			server(this, this.options.api);
		}

		//log uncaughtExceptions
		if(process.env.APP_ENV != 'test')
			process.once('uncaughtException', err => this.logExceptions(this, err));
	}

	/**
   * log uncaught exceptions
   */
	logExceptions(self, err) {
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
   * Log on a call request:
   * log instantly the called route with its params, query, body and method.
   * @param  {string}  url        url called
   * @param  {string}  method     method used
   * @param  {object}  form       body sent to request
   * @param  {boolean} [api=true] is the url called part of a private API
   */
	callRequestLogging(url, method, form, api = true){
		if(!url || !method){
			throw new Error('Url and method are required for your request logging.');
		}
		method = method.toUpperCase();
		let uid = shortid.generate();
		let urlName = (url.split('?'))[0]
			.replace(/(^\w+:|^)\/\//, '')
			.replace(/\//g, '-');
		let logblock = `${urlName}-${method}-${uid}`;
		let logMeta = {
			type: this.logTypes.REST_CLIENT,
			logblock,
			context: 'REQUEST',
		};

		//log request call
		let apiCallMsg = 'API ';
		let msg = 'Request %s';
		if(api){
			msg = apiCallMsg + msg;
		}
		this.logger.info(msg, ansi.blue(`${url}: ${method}`), logMeta);

		//log request query
		let queryString = (url.split('?'))[1];
		let query = queryString ? JSON.parse(
			'{"' + queryString.replace(/&/g, '","').replace(/=/g,'":"') + '"}',
			(key, value) => key===''?value:decodeURIComponent(value)
		):{};
		if(!_.isEmpty(query)){
			let logMetaQuery = Object.assign({}, logMeta, {query});
			this.logger.info('Query params: ', logMetaQuery);
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
			throw new Error('Url and method are required for your request logging.');
		}
		method = method.toUpperCase();
		let uid = shortid.generate();
		let urlName = (url.split('?'))[0]
			.replace(/(^\w+:|^)\/\//, '')
			.replace(/\//g, '-');

		let logblock = `${urlName}-${method}-${uid}`;
		let logMeta = {
			type: this.logTypes.REST_CLIENT,
			logblock,
			context: 'REQUEST',
		};
		//log request error
		if(!_.isEmpty(err)){
			let logMetaError = Object.assign({}, logMeta, {err});
			this.logger.error('Request fail on: ', logMetaError);
		} else {
			//log request call
			let level = levelFromResStatus(httpResponse.statusCode);
			let msg = api ? '%s API Response %s ' : '%s Response %s ';
			let status = (err || httpResponse.statusCode >= 300 || httpResponse.statusCode < 200) ?
				ansi.red.bold(`[Error] ${httpResponse.statusCode}`) :
				ansi.green.bold(`[Success] ${httpResponse.statusCode}`);
			this.logger.log(level, msg, status, ansi.blue(`${url}: ${method}`), logMeta);
			//log file containing html body
			if (isHtml(body)) {
				let data = body.toString();
				let path = `${this.logDir}/${uid}.html`;
				fs.writeFile(path, data, 'utf8', (rerr) => {
					if (rerr) {
						this.logger.error('Error on write error file', Object.assign({}, logMeta, {err: rerr}));
					}
				});
				this.logger.info('Body Response saved in a HTML file: %s', path, logMeta);
				//log body
			} else if (typeof body === 'string') {
				if (json) {
					try {
						body = JSON.parse(body);
						let logMetaBody = Object.assign({}, logMeta, body);
						this.logger.info('Body Response', logMetaBody);
					} catch (e) {
						let logMetaBodyError = Object.assign({}, logMeta, {body});
						//log error if body can't be parsed to json object
						this.logger.error('Parsing body response to object fail: ', logMetaBodyError);
						this.logger.info('Body Response: %s', body, logMeta);
					}
				} else {
					this.logger.info('Body Response: %s', body.toString(), logMeta);
				}
				//log body if string or object
			} else if (typeof body === 'object') {
				let logMetaBody = Object.assign({}, logMeta, { body: JSON.stringify(body, circular()) });
				this.logger.info('Body Response', logMetaBody);
			} else {
				body = body.toString();
				this.logger.info('Body Response: %s', body, logMeta);
			}
		}
	}

	/**
   * [logWS description]
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

	getlogBlock () {
		let strace = StackTrace.get()[2];
		let logblockName = strace.getMethodName() || strace.getFunctionName() || strace.getFileName();
		let logblockId = shortid.generate();
		return {logblockName, logblockId};
	}

	//add wrapper functions for levels
	debug (...args) {
		if (typeof args[args.length - 1] == 'object') {
			args[args.length - 1].autoLogblock = this.getlogBlock();
		} else {
			throw 'No meta object';
		}
		return this.logger.debug(...args);
	}
	info (...args) {
		if (typeof args[args.length - 1] == 'object') {
			args[args.length - 1].autoLogblock = this.getlogBlock();
		} else {
			throw 'No meta object';
		}
		return this.logger.info(...args);
	}
	notice (...args) {
		if (typeof args[args.length - 1] == 'object') {
			args[args.length - 1].autoLogblock = this.getlogBlock();
		} else {
			throw 'No meta object';
		}
		return this.logger.notice(...args);
	}
	warning (...args) {
		if (typeof args[args.length - 1] == 'object') {
			args[args.length - 1].autoLogblock = this.getlogBlock();
		} else {
			throw 'No meta object';
		}
		return this.logger.warning(...args);
	}
	error (...args) {
		if (typeof args[args.length - 1] == 'object') {
			args[args.length - 1].autoLogblock = this.getlogBlock();
		} else {
			throw 'No meta object';
		}
		return this.logger.error(...args);
	}
	critical (...args) {
		if (typeof args[args.length - 1] == 'object') {
			args[args.length - 1].autoLogblock = this.getlogBlock();
		} else {
			throw 'No meta object';
		}
		return this.logger.critical(...args);
	}
	alert (...args) {
		if (typeof args[args.length - 1] == 'object') {
			args[args.length - 1].autoLogblock = this.getlogBlock();
		} else {
			throw 'No meta object';
		}
		return this.logger.alert(...args);
	}
	emergency (...args) {
		if (typeof args[args.length - 1] == 'object') {
			args[args.length - 1].autoLogblock = this.getlogBlock();
		} else {
			throw 'No meta object';
		}
		return this.logger.emergency(...args);
	}
}

module.exports = Logger;
