/**
 * @module test-logger
 * @fileoverview test file to test routes
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */

const express = require('express');
const Logger = require('../src/logger');
const moment = require('moment');
const { routes } = require('../src/api/routes');
const winstonMongo = require('../src/transports/winston-mongodb').MongoDB;

const supertest = require('supertest');
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;

require('dotenv-extended').load();

describe('api routes', () => {
  let logger, request;
  before(() => {
    logger = new Logger();
    let port = 3025;
    logger.init({
      dbSettings: {
        db: "mongodb://localhost/test"
      },
      api:{ port },
      logDir: './logs'
    });
    let app = express();
    app.listen(port);
    request = supertest(app);
    routes(logger, app, '/test');
  })


  it('should return logs from database', (done) => {
    const page = 0;
    const pageSize = 10;
    const start = page * pageSize;
    const limit = start + pageSize;
    let fields = ['content', 'timestamp', 'context', 'logblock', 'type', 'level'];
    const options = {
      from: moment().subtract(30, "days").toDate(),
      until: moment().toDate(),
      limit,
      start,
      order: 'asc',
      fields
    };
    logger.listLog(options)
      .then(results => {
        request
          .get('/test')
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function(err, res) {
            console.log(res.body);
            console.log(results)
            expect(err).to.be.null;
            expect(res.body).to.be.an('array').that.have.lengthOf(results.length);
            res.body.every((log, i) => {
              fields.push('_id');
              expect(log).to.have.all.keys(fields);
              expect(JSON.stringify(log))
                .to.be.equal(JSON.stringify(results[i]));
            });
            done();
          });
      })
  });

  it('should return logs by block from database', (done) => {
    const page = 0;
    const pageSize = 10;
    const start = page * pageSize;
    const limit = start + pageSize;
    let fields = ['content', 'timestamp', 'context', 'type', 'level'];
    const options = {
      from: moment().subtract(30, "days").toDate(),
      until: moment().toDate(),
      limit,
      start,
      order: 'asc',
      fields,
      group: 'logblock'
    };
    logger.listLog(options)
      .then(results => {
        request
          .get('/test/by-block')
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function(err, res) {
            expect(err).to.be.null;
            expect(res.body).to.be.an('array').that.have.lengthOf(results.length);
            res.body.every(i => expect(i).to.have.all.keys('logs', '_id'))
            fields.push('_id');
            fields.push('logblock');
            res.body[0].logs.every((log, i) => {
              expect(log.logblock).to.be.equal(res.body[0].logs[0].logblock);
              expect(log).to.have.all.keys(fields);
              expect(JSON.stringify(log))
                .to.be.equal(JSON.stringify(results[0].logs[i]));
            });
            done();
          });
      });
  });

});
