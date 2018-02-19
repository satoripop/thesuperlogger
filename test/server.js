/**
 * @module test-logger
 * @fileoverview test file to test server
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */
const server = require('../src/api/server');
const express = require('express');
const Logger = require('../src/logger');

const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;


describe('api server', () => {
  let logger;
  before(() => {
    logger = new Logger();
    logger.init({
      logDir: './logs'
    });
  });

  it('should throw an error on no api settings', () => {
    expect(() => {
      server(logger);
    }).to.throw('You need to pass a port or an existing express app');
  });

  it('should calls app routes if express app passed', () => {
    let app = express();
    let routeSpy = sinon.stub(app, 'get');
    server(logger, {
      appExpress: app,
      logPrefix: '/logs',
    });
    expect(routeSpy.called).to.be.true;
  });

  it('should throw error listen to port if app is already listening and port is passed', () => {
    let port = 3052;
    let app = express();
    app.listen(port);
    expect(() => {
      server(null, {
        logPrefix: '/logs',
        port: 3052
      });
    }).to.throw();
  })
});
