/**
 * @module logblock
 * @fileoverview logblock class to create a logblock instance
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */

// dependency modules
const shortid = require('shortid');
const StackTrace = require('stack-trace');
// our own modules
const Log = require('./log');

/**
 * Logblock class
 */
class Logblock extends Log {
	/**
	 * @param {string} data.name 		logblock name
	 * @param {string} data.context log context
	 * @param {string} data.source  log source
	 */
	constructor(data) {
		super();
		let name, context, source;
		if (typeof data == 'string') {
			name = data;
		} else {
			let name = data.name,
				context = data.context,
				source = data.source;
		}

		let logblockId = shortid.generate();
		if (name) {
			this.name = `${name}-${logblockId}`;
		} else {
			let strace = StackTrace.get()[2];
			let logblockName = strace.getMethodName() || strace.getFunctionName() || strace.getFileName();
			this.name = `${logblockName}-${logblockId}`;
		}
		if (context) this.context = context;
		if (source) this.source = source;
	}

	/**
	 * set log args
	 * @param {array} args log args
	 * @return {array} return args with new meta
	 */
	_setLogMeta(args){
		let context = this.context;
		let source = this.source;
		let meta = args[args.length - 1];
		if (typeof meta == 'object') {
			args[args.length - 1].logblock = meta.logblock || this.name;
			context = meta.context;
			source = meta.source;
		} else {
			args[args.length] = {logblock: this.name};
		}
		args.context = context;
		args.source = source;
		return args;
	}

	//add wrapper functions for levels
	debug (...args) {
		args = this._setLogMeta(args);
		return super.debug(...args);
	}
	info (...args) {
		args = this._setLogMeta(args);
		return super.info(...args);
	}
	notice (...args) {
		args = this._setLogMeta(args);
		return super.notice(...args);
	}
	warning (...args) {
		args = this._setLogMeta(args);
		return super.warning(...args);
	}
	error (...args) {
		args = this._setLogMeta(args);
		return super.error(...args);
	}
	critical (...args) {
		args = this._setLogMeta(args);
		return super.critical(...args);
	}
	alert (...args) {
		args = this._setLogMeta(args);
		return super.alert(...args);
	}
	emergency (...args) {
		args = this._setLogMeta(args);
		return super.emergency(...args);
	}

	/**
	 * End Request Logging wrapper
	 * @param  {string}  method       method used
	 * @param  {object}  err          error on request
	 * @param  {object}  httpResponse httpResponse
	 * @param  {object}  body         body Response
	 * @param  {boolean} [api=true]   is the url called part of a private API
	 * @param  {boolean} [json=false] is the body response a json
	 * @param  {string}  logblock		logblock value
	 */
	endRequestLogging(url, method, err, httpResponse, body, api = true, json = false) {
		super._endRequestLogging(url, method, err, httpResponse, body, api, json, this.name);
	}

	/**
	 * Call Request Logging wrapper
	 * @param  {string}  url        url called
	 * @param  {string}  method     method used
	 * @param  {object}  form       body sent to request
	 * @param  {boolean} [api=true] is the url called part of a private API
	 * @param  {string}  logblock		logblock value
	 */
	callRequestLogging(url, method, form, api = true) {
		super._callRequestLogging(url, method, form, api, this.name);
	}
}

module.exports = Logblock;
