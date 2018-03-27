/**
 * @module test-log
 * @fileoverview test file to test log class
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */

const Logger = require('../src/logger');

describe('log', () => {
	let logger = new Logger();
	let options = {
		logDir: './logs',
	};
	logger.init(options);
	let logging = logger.Log;

	beforeEach(() => {
		logger = new Logger();
	});

	require('./abstract-log')({
		name: 'log',
		type: logging,
		logger,
	});

	afterEach(() => {
		logger.clear(logger);
	});
});
