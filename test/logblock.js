/**
 * @module test-logger
 * @fileoverview test file to test logblock
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */
const Logger = require('../src/logger');
const {levels} = require('../src/helpers/levelsSettings');

const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;


describe('logblock', () => {
	let logger;
	let Logblock;
	before(() => {
		logger = new Logger();
		logger.init({
			logDir: './logs',
		});
		Logblock = require('../src/logblock')(logger);
	});

	describe('.getLogblock()', () => {
		it('should be present', () => {
			assert.ok(Logblock.getLogblock);
			assert.equal('function', typeof Logblock.getLogblock);
		});

		it('should return logblock name', () => {
			let name = Logblock.getLogblock();
			expect((name.split('-'))[0]).to.be.equal('callFn');
			expect(name).to.be.string;
		});
	});

	describe('.setLogblock()', () => {
		it('should be present', () => {
			assert.ok(Logblock.setLogblock);
			assert.equal('function', typeof Logblock.setLogblock);
		});

		it('should set logblock', () => {
			let args = Logblock.setLogblock([], 'test');
			expect(args[args.length - 1].logblock).to.be.equal('test');
			expect(args[args.length - 1].logblock).to.be.string;
		});
	});

	describe('Instance', () => {
		it('should be present', () => {
			assert.ok(Logblock.Instance);
			assert.equal('function', typeof Logblock.Instance);
		});

		it('should contain log wrapeprs', () => {
			let logblock = new Logblock.Instance();
			function hasMethod (obj, name) {
			  const desc = Object.getOwnPropertyDescriptor (obj, name);
			  return typeof desc.value === 'function';
			}
			function getInstanceMethodNames (obj) {
			  let array = [];
			  let proto = Object.getPrototypeOf (obj);
				let stop = false;
			  while (proto && !stop) {
			    Object.getOwnPropertyNames (proto)
			      .forEach (name => {
							if( name == "emergency") stop = true;
			        if (name !== 'constructor') {
			          if (hasMethod (proto, name)) {
			            array.push (name);
			          }
			        }
			      });
			    proto = Object.getPrototypeOf (proto);
			  }
			  return array;
			}
			let methods = getInstanceMethodNames(logblock);
			let expectedMethods = ['setLogblock'];
			for (level in levels) {
				expectedMethods.push(level);
			}
			expect(methods).to.be.eql(expectedMethods);
		})
	});

});
