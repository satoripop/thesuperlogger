/**
 * @module 'test-winston-abstract-transport'
 * @fileoverview test file to test winston-transport
 * @license MIT
 * @author charlie@nodejitsu.com (Charlie Robbins)
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */

const assert = require('assert');
const { LEVEL, MESSAGE } = require('triple-beam');
const shortid = require('shortid');

module.exports = (options) => {
  options = options || {};

  var Transport = options.Transport;
  var name = Transport.name || options.name;
  var settings = options.settings || {};
  var instance;
  beforeEach(() => {
    instance = new Transport(settings);
  });

  describe('.log()', () => {
    it('should be present', () => {
      assert.ok(instance.log);
      assert.equal('function', typeof instance.log);
    });

    it('(with no callback) should return true', () => {
      var info = {
        [LEVEL]: 'debug',
        level: 'debug',
        message: 'foo',
        context: 'TEST',
        logblock: 'test-block-' + shortid.generate()
      };

      info[MESSAGE] = JSON.stringify(info);
      var result = instance.log(info);
      assert(true, result);
    });

    it('(with callback) should return true', (done) => {
    var info = {
      [LEVEL]: 'debug',
      level: 'debug',
      message: 'foo',
      context: 'TEST',
      logblock: 'test-block-' + shortid.generate()
    };

    info[MESSAGE] = JSON.stringify(info);
    var result = instance.log(info, () => {
      assert(true, result);
      done();
    });
  });
  });

  describe('events', () => {
    it('should emit the "logged" event', (done) => {
      instance.once('logged', (info) => {
        done()
      });

      var info = {
        [LEVEL]: 'debug',
        level: 'debug',
        message: 'foo',
        context: 'TEST',
        logblock: 'test-block-' + shortid.generate()
      };

      info[MESSAGE] = JSON.stringify(info);
      instance.log(info);
    });
  });

  afterEach((done) => {
    if (options.afterEach) {
      return options.afterEach(options, done);
    }
    done();
  });

  after((done) => {
    if (options.afterEach) {
      return options.afterEach(options, done);
    }
    done();
  });
}
