/**
 * @module 'test-winston-mail'
 * @fileoverview test file to test winston-mongodb transport
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */
const winstonMongo = require('../src/transports/winston-mongodb').MongoDB;
const test_suite = require('./abstract-transport');
const mongodb = require('mongodb');
const assert = require('assert');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
require('dotenv-extended').load();


describe('MongoDb Transport', () => {
  let dbUrl = "mongodb://localhost/test";
  var stub = sinon.stub(console, 'error');
  it('{db: url} should console error on wrong auth db settings', (done) => {
    let transport = new winstonMongo({
      db: "test"
    })
    setTimeout(() => {
      expect( console.error.called ).to.be.true;
      expect( console.error.calledWith('super-logger(mongodb): error initialising logger'))
        .to.be.true;
      done();
    }, 1000);
  });

  it('{db: promise} should console error on wrong auth db settings', (done) => {
    let transport = new winstonMongo({
      db: mongodb.MongoClient.connect("test")
    })
    setTimeout(() => {
      expect( console.error.called).to.be.true;
      expect( console.error.calledWith('super-logger(mongodb): error initialising logger from promise'))
        .to.be.true;
      done();
    }, 1000);
  });

  describe('.query()', () => {
    it('should be present', () => {
      let transport = new winstonMongo({
        db: dbUrl
      });
      assert.ok(transport.query);
      assert.equal('function', typeof transport.query);
    });

    it('should call callback (without options)', (done) => {
      let transport = new winstonMongo({
        db: dbUrl
      });
      var cbSpy = sinon.spy();
      transport.query(cbSpy);
      setTimeout(() => {
        expect(cbSpy.called).to.be.true;
        done();
      }, 1000);
    });

    it('should call callback (with options)', (done) => {
      let transport = new winstonMongo({
        db: dbUrl
      });
      var cbSpy = sinon.spy();
      transport.query({level: 'debug'}, cbSpy);
      setTimeout(() => {
        expect(cbSpy.called).to.be.true;
        done();
      }, 1000);
    });
  });

  test_suite({
    name: '{db: url}',
    Transport: winstonMongo,
    settings: {db: dbUrl}
  });

  test_suite({
    name: '{db: promise}',
    Transport: winstonMongo,
    settings: {
      db: mongodb.MongoClient.connect(dbUrl)
    }
  });
})
