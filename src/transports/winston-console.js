/**
  * @module 'winston-console'
  * @fileoverview Transport for outputting to the console
  * @license MIT
  * @author charlie@nodejitsu.com (Charlie Robbins)
  * @author imen.ammar@satoripop.tn (Imen Ammar)
 */

const os = require('os');
const util = require('util');
const ansi = require('chalk');
const moment = require('moment');
const { LEVEL, MESSAGE } = require('triple-beam');
const TransportStream = require('winston-transport');
const helpers = require('./helpers');
const {colors} = require('../helpers/levelsSettings');
const _ = require('lodash');
//
// ### function Console (options)
// #### @options {Object} Options for this instance.
// Constructor function for the Console transport object responsible
// for persisting log messages and metadata to a terminal or TTY.
//
var Console = module.exports = function (options) {
  options = options || {};
  TransportStream.call(this, options);
  this.stderrLevels = getStderrLevels(options.stderrLevels, options.debugStdout);
  this.eol = options.eol || os.EOL;

  //
  // Convert stderrLevels into an Object for faster key-lookup times than an Array.
  //
  // For backwards compatibility, stderrLevels defaults to ['error', 'debug']
  // or ['error'] depending on whether options.debugStdout is true.
  //
  function getStderrLevels(levels, debugStdout) {
    var defaultMsg = 'Cannot have non-string elements in stderrLevels Array';
    if (debugStdout) {
      if (levels) {
        //
        // Don't allow setting both debugStdout and stderrLevels together,
        // since this could cause behaviour a programmer might not expect.
        //
        throw new Error('Cannot set debugStdout and stderrLevels together');
      }

      return stringArrayToSet(['error'], defaultMsg);
    }

    if (!levels) {
      return stringArrayToSet(['error', 'debug'], defaultMsg);
    } else if (!(Array.isArray(levels))) {
      throw new Error('Cannot set stderrLevels to type other than Array');
    }

    return stringArrayToSet(levels, defaultMsg);
  }
};

//
// Inherit from `winston.Transport`.
//
util.inherits(Console, TransportStream);

//
// Expose the name of this Transport on the prototype
//
Console.prototype.name = 'console';

//
// ### function log (info)
// #### @info {Object} **Optional** Additional metadata to attach
// Core logging method exposed to Winston.
//
Console.prototype.log = function (info, callback) {
  var self = this;

  setImmediate(function () {
    self.emit('logged', info);
  });

  let meta;
  if (info.splat) {
    meta = Object.assign({}, info.meta);
  } else {
    meta = Object.assign({}, info);
    delete meta.message;
    delete meta.level;
  }
  let extras = helpers.prepareMetaData({context: meta.context, logblock: meta.logblock});
  delete meta.logblock;
  delete meta.context;
  delete meta.type;
  delete meta.splat;
  let message = moment().format('YYYY/MM/DD_HH:mm:ss') + ' ';
  message += ansi[colors[info[LEVEL]]](info[LEVEL]) + ': ';
  message += info.message.replace(/^\s+|\s+$/g, '');

  let metaObject = helpers.prepareMetaData(meta);
  message += _.isEmpty(metaObject) ? '': '\n';
  message += _.isEmpty(metaObject) ? '': JSON.stringify(metaObject);
  message += _.isEmpty(extras) ? '': '\n';
  message += _.isEmpty(extras) ? '': JSON.stringify(extras);

  if (this.stderrLevels[info[LEVEL]]) {
    process.stderr.write(message + this.eol + this.eol);
    if (callback) { callback(); } // eslint-disable-line
    return;
  }

  process.stdout.write(message + this.eol + this.eol);
  if (callback) { callback(); } // eslint-disable-line
};

//
// ### function stringArrayToSet (array)
// #### @strArray {Array} Array of Set-elements as strings.
// #### @errMsg {string} **Optional** Custom error message thrown on invalid input.
// Returns a Set-like object with strArray's elements as keys (each with the value true).
//
function stringArrayToSet(strArray, errMsg) {
  errMsg = errMsg || 'Cannot make set from Array with non-string elements';

  return strArray.reduce(function (set, el) {
    if (typeof el !== 'string') { throw new Error(errMsg); }
    set[el] = true;
    return set;
  }, {});
}
