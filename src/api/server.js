/**
 * @module server
 * @fileoverview Express server manager for logging api
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */

const _ = require('lodash');
const { routes } = require('./routes');

/**
 * launching express server for api Logging
 * @param  {object}  logger         logger instance
 * @param  {object}  api.appExpress express app
 * @param  {string}  api.logPrefix  routes prifix for listing logs
 * @param  {integer} api.port       port for the express app
 */
module.exports = (logger, api) => {
  let routesPrefix = api.logPrefix || '/';
  // pass express app
  if (api.appExpress && !_.isEmpty(api.appExpress)) {
    routes(logger, api.appExpress, routesPrefix);
  // create express app
} else if (api.port) {
    const express = require('express');
    let app = express();
    routes(logger, app, routesPrefix);
    app.listen(api.port, () => {
      console.log("Logging server is working on ", api.port);
    });
  } else {
    throw new Error('You need to pass a port or an existing express app');
  }
};
