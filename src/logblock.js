/**
 * @module logger
 * @fileoverview logger class to create a logger instance
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */

// dependency modules
const shortid = require('shortid');
const StackTrace = require('stack-trace');

module.exports = (logger) => {
	const getLogblock = () => {
		let strace = StackTrace.get()[2];
		let logblockName = strace.getMethodName() || strace.getFunctionName() || strace.getFileName();
		let logblockId = shortid.generate();
		return `${logblockName}-${logblockId}`;
	};
	const setLogblog = (args, name) => {
		if (typeof args[args.length - 1] == 'object') {
			args[args.length - 1].logblock = args[args.length - 1].logblock || name;
		} else {
			args[args.length] = {logblock: name};
		}
		return args;
	};

	class Logblock {
		constructor(name) {
			if (name) {
				this.name = name;
			} else {
				this.name = getLogblock();
			}
		}

		setLogblog(args){
			if (typeof args[args.length - 1] == 'object') {
				delete args[args.length - 1].logblock;
			}
			return setLogblog(args, this.name);
		}

		//add wrapper functions for levels
		debug (...args) {
			args = this.setLogblog(args);
			return logger.debug(...args);
		}
		info (...args) {
			args = this.setLogblog(args);
			return logger.info(...args);
		}
		notice (...args) {
			args = this.setLogblog(args);
			return logger.notice(...args);
		}
		warning (...args) {
			args = this.setLogblog(args);
			return logger.warning(...args);
		}
		error (...args) {
			args = this.setLogblog(args);
			return logger.error(...args);
		}
		critical (...args) {
			args = this.setLogblog(args);
			return logger.critical(...args);
		}
		alert (...args) {
			args = this.setLogblog(args);
			return logger.alert(...args);
		}
		emergency (...args) {
			args = this.setLogblog(args);
			return logger.emergency(...args);
		}
	}
	return {
		Instance : Logblock,
		getLogblock,
		setLogblog,
	};
}
