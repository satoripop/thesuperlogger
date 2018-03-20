/**
 * @module test-logger
 * @fileoverview test file to test logger class
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */

const express = require('express');
const bodyParser = require('body-parser');
const Logger = require('../src/logger');
const logTypes = require('../src/helpers/logTypes');
const {levels, lowestLevel, colors, levelFromStatus, levelFromResStatus} = require('../src/helpers/levelsSettings');
const request = require('request');

const sinon = require('sinon');
const chai = require('chai');
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const expect = chai.expect;

require('dotenv-extended').load();
process.setMaxListeners(0);
describe('logger', ()=>{
  let app, api, logger;
  let mailSettings = {
    transportOptions: {
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
      }
    },
    to: process.env.MAIL_TO,
    from: process.env.MAIL_USER
  };
  let dbSettings = {
    db: "mongodb://localhost/test"
  };

  beforeEach(() => {
    logger = new Logger();
  });

  before(() => {
    app = express();
    app.use(bodyParser.urlencoded({
      extended: true
    }));
    app.use(bodyParser.json());

    api = {
      appExpress: app,
      logPrefix: '/logs'
    };
  })

  describe('logger initiation', () => {
    describe('sucessful use cases of logger initiation', () => {
      let options;

      beforeEach(() => {
        expect(logger).to.have.property('logTypes');
        expect(logger.logTypes).to.eql(logTypes);
      });

      it('should succeed to init logger with no db or mail transport', () => {
        options = {
          logDir: './logs',
          api
        };
        logger.init(options);

        expect(logger).to.not.have.property('dbLevel');
        expect(logger).to.not.have.property('dbTransport');
        expect(logger).to.not.have.property('mailLevel');
      });

      it('should succeed to init logger with db transport', () => {
        options = {
          logDir: './logs',
          dbSettings,
          api
        };
        logger.init(options);

        expect(logger).to.have.property('dbLevel');
        if(process.env.DB_LOG_LEVEL) {
          expect(logger.dbLevel).to.equal(process.env.DB_LOG_LEVEL);
        } else {
          expect(logger.dbLevel).to.equal(lowestLevel);
        }
        expect(logger).to.have.property('dbTransport');

        expect(logger).to.not.have.property('mailLevel');
      });

      it('should succeed to init logger with mail transport', () => {
        options = {
          logDir: './logs',
          api,
          mailSettings
        };
        logger.init(options);

        expect(logger).to.not.have.property('dbLevel');
        expect(logger).to.not.have.property('dbTransport');

        expect(logger).to.have.property('mailLevel');
        if(process.env.MAIL_LOG_LEVEL) {
          expect(logger.mailLevel).to.equal(process.env.MAIL_LOG_LEVEL);
        } else {
          expect(logger.mailLevel).to.equal(lowestLevel);
        }
      });

      afterEach(() => {
        expect(logger).to.have.property('options');
        expect(logger.options).to.eql(options);

        expect(logger).to.have.property('logDir');
        expect(logger.logDir).to.eql(options.logDir);

        expect(logger).to.have.property('level');
        if(process.env.LOG_LEVEL) {
          expect(logger.level).to.equal(process.env.LOG_LEVEL);
        } else {
          expect(logger.level).to.equal(lowestLevel);
        }
        //logger.clear(logger);
      });
    });

    describe('failing use cases of logger initiation', () => {
      it('should throw an error on no logDir', () => {
        let options = {};
        expect(() => {
          logger.init(options);
        }).to.throw();
        //logger.clear(logger);
      });
    });
  });

  describe('logger clear', () => {
    it('should make winston logger undefined', () => {
      logger.init({
        logDir: './logs',
        api
      })
      logger.clear(logger);
      logger = new Logger();
      expect(logger.logger).to.be.undefined;
    });
  });

  describe('logger handle Exceptions', () => {
    it('should not log to mongodb transport', (done) => {
      logger.init({
        logDir: './logs',
        dbSettings,
        api
      });
      process.exit = () => { };
      var eventSpy = sinon.spy();
      setTimeout(() => {
        expect(eventSpy.called).to.be.false;
        done();
      }, 1000);
      logger.dbTransport.on('logged', eventSpy);
      var e = new Error("test");
      e.name = "MongoError";
      logger.logExceptions(logger, e);
    });

    it('should exit immediatly if no mail transport exist on MongoError', (done) => {
      logger.init({
        logDir: './logs',
        dbSettings,
        api
      });
      let logEmitted = 0;
      process.exit = () => {
        expect(logEmitted).to.be.equal(0);
        done();
      };
      logger.dbTransport.on('logged', info => {
        logEmitted++;
      });
      var e = new Error("test");
      e.name = "MongoError";
      logger.logExceptions(logger, e);
    });

    it('should exit after logging if mail and db transport exist', (done) => {
      logger.init({
        logDir: './logs',
        dbSettings,
        mailSettings,
        api
      });
      let logEmitted = 0;
      process.exit = () => {
        expect(logEmitted).to.be.equal(2);
        done();
      };
      logger.mailTransport.on('logged', info => {
        logEmitted++;
      });
      logger.dbTransport.on('logged', info => {
        logEmitted++;
      });
      logger.logExceptions(logger, 'error');
    });
  });

  // describe('logger expressLogging middleware', () => {
  //   it()
  // });

  describe('logger request logging', () => {
    beforeEach(() => {
      logger.init({
        logDir: './logs',
        api
      });
    });

    describe('logger callRequestLogging', () => {
      it('should throw error in method or url missing', () => {
        expect(() => {
          logger.callRequestLogging();
        }).to.throw();
      });
    });

    describe('logger endRequestLogging', () => {

      it('should throw error in method or url missing', () => {
        expect(() => {
          logger.endRequestLogging();
        }).to.throw();
      });

      it('should not throw error in circular objects', () => {
        expect(() => {
          let url = "http://validate.jsontest.com/?json=%5BJSON-code-to-validate%5D";
          request.get(url, (err, httpResponse, body) => {
            body = {test: body}; //create circular object
            logger.endRequestLogging(url, 'get', err, httpResponse, body);
          });
        }).to.not.throw();
      });

    });
  })

  describe('logger websocket logging', () => {
    it('should throw an error if not io socket object is passed', () => {
      //logger.clear(logger);
      logger.init({
        logDir: './logs',
        api
      });
      let io = "I'm not a socket object";
      expect(() => {
        logger.wsLogging(io);
      }).to.throw();
    });
  });

  describe('logger listing log from database', () => {
    it('should throw error if no mongo transport', () => {
      //logger.clear(logger);
      logger.init({
        logDir: './logs',
        api
      });
      expect(logger.listLog()).to.be.rejected;
    });

    it('should resolve an array', (done) => {
      //logger.clear(logger);
      logger.init({
        logDir: './logs',
        dbSettings,
        api
      });
      logger.listLog()
      .then((res) => {
        expect(res).to.be.an('array');
        done();
      });
    })
  });

  describe('logger level wrappers', () => {
    beforeEach(() => {
      logger.init({
        logDir: './logs',
        dbSettings,
        mailSettings,
        api
      });
    });
  });

  afterEach(() => {
    logger.clear(logger);
  });
})
