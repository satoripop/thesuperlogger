/**
 * @module 'test-winston-mail'
 * @fileoverview test file to test winston-mail transport
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */
const winstonMail = require('../src/transports/winston-mail').Mail;
const { LEVEL, MESSAGE } = require('triple-beam');
const shortid = require('shortid');
const assert = require('assert');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
require('dotenv-extended').load();


describe('Mail Transport', () => {
	it('should throw error if no to', () => {
		expect(()=> {
			let transport = new winstonMail();
		}).to.throw('super-logger(winston-email) requires \'to\' property');
	});

	it('should throw error if no transportOptions', () => {
		expect(()=> {
			let transport = new winstonMail({to: process.env.MAIL_TO});
		}).to.throw('super-logger(winston-email) requires \'transportOptions\'');
	});

	it('should throw error if wrong transportOptions', () => {
		expect(()=> {
			let transport = new winstonMail({
				to: process.env.MAIL_TO,
				transportOptions: 'fake wrong data',
			});
		}).to.throw();
	});

	it('should call callback if level is below transport level', () => {
		let transport = new winstonMail({
			transportOptions: {
				host: process.env.MAIL_HOST,
				port: process.env.MAIL_PORT,
				auth: {
					user: process.env.MAIL_USER,
					pass: process.env.MAIL_PASSWORD,
				},
			},
			to: process.env.MAIL_TO,
			from: process.env.MAIL_USER,
			level: 'info',
		});
		let info = {
			[LEVEL]: 'debug',
			level: 'debug',
			message: 'foo',
			context: 'TEST',
			logblock: 'test-block-' + shortid.generate(),
		};
		var cbSpy = sinon.spy();
		info[MESSAGE] = JSON.stringify(info);
		let result = transport.log(info, cbSpy);
		expect(cbSpy.called).to.be.true;
		assert(true, result);
	});

	require('./abstract-transport')({
		name: '',
		Transport: winstonMail,
		settings: {
			transportOptions: {
				host: process.env.MAIL_HOST,
				port: process.env.MAIL_PORT,
				auth: {
					user: process.env.MAIL_USER,
					pass: process.env.MAIL_PASSWORD,
				},
			},
			to: process.env.MAIL_TO,
			from: process.env.MAIL_USER,
		},
	});
});
