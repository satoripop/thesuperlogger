/**
  * @module 'winston-email'
  * @fileoverview Transport to send to email
  * @license MIT
  * @author imen.ammar@satoripop.tn (Imen Ammar)
 */

const util = require('util');
const os = require('os');
const { LEVEL, MESSAGE } = require('triple-beam');
const moment = require('moment');
const _ = require('lodash');
const nodemailer = require('nodemailer');
const {lowestLevel, levels} = require('../helpers/levelsSettings');
const helpers = require('./helpers');
let Transport = require("winston-transport");

/**
 * @constructs Mail
 * @param {object} options Hash of options.
 */
let Mail = exports.Mail = function(options) {
  options = options || {}
  Transport.call(this, options);

  if (!options.to) {
    throw new Error("super-logger(winston-email) requires 'to' property")
  }

  if (!options.transportOptions) {
    throw new Error("super-logger(winston-email) requires 'transportOptions'")
  }

  this.to = options.to;
  this.from = options.from || 'super-logger@' + os.hostname();
  this.subject = options.subject || '';
  this.html = options.html || false; // Send mail in html format
  this.formatter = options.formatter || false;

  this.transporter = nodemailer.createTransport(
    options.transportOptions
  );
}

/**
 * Inherit from `winston.Transport`.
 */
util.inherits(Mail, Transport);

/**
 * Define a getter so that `winston.transports.Mail`
 * is available and thus backwards compatible.
 */
Transport.Mail = Mail;

/**
 * Core logging method exposed to Winston. Metadata is optional.
 * @param {object} info **Optional** Additional metadata to attach
 * @param {Function} cb Continuation to respond to when complete.
 */
Mail.prototype.log = function(info, cb) {
  var self = this
  let level = info[LEVEL];
  if (levels[level] != levels[lowestLevel] && levels[level] >= levels[this.level])
    return cb(null, true);

  let body;
  let subject = level + ' ' + this.subject + ': ';
  if (this.formatter) {
    body = this.formatter(info);
  } else {
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
    message += info[LEVEL] + ': ';
    let msgSubject = info.splat ? util.format(info.message, ...info.splat): info.message;
    subject += msgSubject
    message += msgSubject;
    message = message.replace(/\u001b\[[0-9]{1,2}m/g, '');
    let metaObject = helpers.prepareMetaData(meta, true);

    message += _.isEmpty(metaObject) ? '': '\n';
    message += _.isEmpty(metaObject) ? '': JSON.stringify(metaObject);
    message += _.isEmpty(extras) ? '': '\n';
    message += _.isEmpty(extras) ? '': JSON.stringify(extras);
    body = message;
  }

  var mailOptions = {
    from: this.from,
    to: this.to,
    subject: subject.replace(/\u001b\[[0-9]{1,2}m/g, ''),
    text: body
  }

  // Send mail as html.
  if (this.html) {
    mailOptions.html = body
  }
  // send mail with defined transport object
  this.transporter.sendMail(mailOptions, (error, data) => {
    if (error) {
      self.emit('error', error)
      return console.error(error);
    }
    self.emit('logged', info);
    try {
      cb(null, true)
    } catch (e) {
      console.error('super-logger(winston-email), Failed to send Email: ', e)
    }
  });
}
