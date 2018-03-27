/**
 * @module log
 * @fileoverview log class to create a log instance
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */

// dependency modules
const shortid = require('shortid');
const _ = require('lodash');
const isHtml = require('is-html');
const fs = require('fs');
const circular = require('circular');
// our own modules
const ansi = require('./helpers/ansi.js');
const logTypes = require('./helpers/logTypes');
const {levelFromResStatus} = require('./helpers/levelsSettings');

/**
 * Log class
 */
class Log {
	constructor() {
		const Logger = require('./logger');
		const logger = new Logger();
		this.logger = logger.logger;
		this.logDir = logger.logDir;
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

	/**
	 * Log on a call request:
	 * log instantly the called route with its params, query, body and method.
	 * @param  {string}  url        url called
	 * @param  {string}  method     method used
	 * @param  {object}  form       body sent to request
	 * @param  {boolean} [api=true] is the url called part of a private API
	 * @param  {string}  logblock		logblock value
	 */
	_callRequestLogging(url, method, form, api = true, logblock){
		if(!url || !method){
			throw new Error('Url and method are required for your request logging.');
		}
		method = method.toUpperCase();
		let uid = shortid.generate();
		let urlName = (url.split('?'))[0]
			.replace(/(^\w+:|^)\/\//, '')
			.replace(/\//g, '-');
		logblock = logblock || `${urlName}-${method}-${uid}`;
		let logMeta = {
			type: logTypes.REST_CLIENT,
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
	 * wrapper for callRequestLogging
	 * @param  {array} args
	 */
	callRequestLogging(...args) {
		this._callRequestLogging(...args);
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
	 * @param  {string}  logblock		logblock value
	 */
	_endRequestLogging(url, method, err, httpResponse, body, api = true, json = false, logblock){
		if(!url || !method){
			throw new Error('Url and method are required for your request logging.');
		}
		method = method.toUpperCase();
		let uid = shortid.generate();
		let urlName = (url.split('?'))[0]
			.replace(/(^\w+:|^)\/\//, '')
			.replace(/\//g, '-');

		logblock = logblock || `${urlName}-${method}-${uid}`;
		let logMeta = {
			type: logTypes.REST_CLIENT,
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
	 * wrapper for endRequestLogging
	 * @param  {array} args
	 */
	endRequestLogging(...args) {
		this._endRequestLogging(...args);
	}
}

module.exports = Log;
