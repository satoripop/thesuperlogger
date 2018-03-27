/**
 * @module 'test-abstract-log'
 * @fileoverview test file to test log
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */



const {levels} = require('../src/helpers/levelsSettings');
const _ = require('lodash');
const request = require('request');

const chai = require('chai');
const expect = chai.expect;
const assert = require('assert');

require('dotenv-extended').load();
process.setMaxListeners(0);

module.exports = (options) => {
	const name = options.name;
	const logger = options.logger;
	const logging = options.type;

	describe(name + ' level wrappers', () => {
		it('should contain log wrapeprs', () => {
			function hasMethod (obj, name) {
				const desc = Object.getOwnPropertyDescriptor (obj, name);
				return typeof desc.value === 'function';
			}
			function getInstanceMethodNames (obj) {
				let array = [];
				let proto = Object.getPrototypeOf (obj);
				let stop = false;
				while (proto && !stop) {
					Object.getOwnPropertyNames (proto).forEach (name => {
						if( name == 'emergency') stop = true;
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
			let methods = getInstanceMethodNames(logging);
			let expectedMethods = [];
			for (let level in levels) {
				expectedMethods.push(level);
			}
			let result = _.intersection(expectedMethods, methods);
			expect(result).to.be.eql(expectedMethods);
		});
	});

	describe(name + '.callRequestLogging()', () => {
		it('should be present', () => {
			assert.ok(logging.callRequestLogging);
			assert.equal('function', typeof logging.callRequestLogging);
		});

		it('should throw error in method or url missing', () => {
			expect(() => {
				logging.callRequestLogging();
			}).to.throw();
		});
	});

	describe(name + '.endRequestLogging()', () => {
		it('should be present', () => {
			assert.ok(logging.endRequestLogging);
			assert.equal('function', typeof logging.endRequestLogging);
		});

		it('should throw error in method or url missing', () => {
			expect(() => {
				logging.endRequestLogging();
			}).to.throw();
		});

		it('should not throw error in circular objects', (done) => {
			let url = 'http://validate.jsontest.com/?json=%5BJSON-code-to-validate%5D';
			request.get(url, (err, httpResponse, body) => {
				body = {test: body}; //create circular object
				expect(() => {
					logging.endRequestLogging(url, 'get', err, httpResponse, body);
				}).to.not.throw();
				done();
			});
		});
	});


};
