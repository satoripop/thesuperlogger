/**
 * @module test-logger
 * @fileoverview test file to test logblock
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */
const Logger = require('../src/logger');
const {levels} = require('../src/helpers/levelsSettings');
const Logblock = require('../src/logblock');
const StackTrace = require('stack-trace');

const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;


describe('logblock', () => {
	let logger = new Logger();
	let options = {
		logDir: './logs',
	};
	logger.init(options);
	let logging = new logger.Logblock('test-logblock');

	beforeEach(() => {
		logger = new Logger();
		logger.init(options);
	});

	describe('constructor', () => {
		it('should accept no params', () => {
			let logblock, strace;
			expect(() => {
				strace = StackTrace.get()[1];
				logblock = new logger.Logblock();
			}).to.not.throw();
			let logblockName = strace.getMethodName() || strace.getFunctionName() || strace.getFileName();
			expect(logblock.name.includes(logblockName)).to.be.true;
		});

		it('should accept string params', () => {
			let logblock;
			let logblockName = 'test-logblock';
			expect(() => {
				logblock = new logger.Logblock(logblockName);
			}).to.not.throw();
			expect(logblock.name.includes(logblockName)).to.be.true;
		});

		it('should accept object params', () => {
			let logblock;
			let logblockName = 'test-logblock';
			expect(() => {
				logblock = new logger.Logblock({
					name: logblockName,
					context: 'TEST',
					source: 'TEST',
				});
			}).to.not.throw();
			expect(logblock.name.includes(logblockName)).to.be.true;
			expect('TEST').to.be.equal(logblock.context);
			expect('TEST').to.be.equal(logblock.source);
		});
	});
	describe('._setLogMeta()', () => {
		it('should return array of args with constructor value (without meta)', () => {
			let name = 'test-logblock',
				context = 'TEST',
				source = 'TEST';
			let logblock = new logger.Logblock({
				name,
				context,
				source,
			});
			let result = logblock._setLogMeta(['text']);
			expect(result).to.be.an('array');
			expect(result[1].context).to.be.equal(context);
			expect(result[1].source).to.be.equal(source);
			expect(result[1].logblock.includes(name)).to.be.true;
		});

		it('should return array of args with constructor value (with meta)', () => {
			let name = 'test-logblock',
				context = 'TEST',
				source = 'TEST';
			let logblock = new logger.Logblock({
				name,
				context,
				source,
			});
			let result = logblock._setLogMeta(['text', {context: 'TEST2'}]);
			expect(result).to.be.an('array');
			expect(result[1].context).to.not.be.equal(context);
			expect(result[1].source).to.be.equal(source);
			expect(result[1].logblock.includes(name)).to.be.true;
		});
	});

	require('./abstract-log')({
		name: 'logblock',
		type: logging,
		logger,
	});

	afterEach(() => {
		logger.clear(logger);
	});
});
