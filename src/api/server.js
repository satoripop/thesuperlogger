/**
 * @module server
 * @fileoverview Express server manager for logging api
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */

const _ = require('lodash');

/**
 * launching express server for api Logging
 * @param  {object}  logger logger instance
 * @param  {object}  app    express app
 * @param  {integer} port   port for the express app
 */
module.exports = (logger, app, port) => {
  // pass express app
  if (app && !_.isEmpty(app)) {
    require('api/routes.js')(logger, app);
  // create express app
  } else if (port) {
    const express = require('express');
    let app = express();
    require('api/routes.js')(logger, app);
    app.listen(port, () => {
      console.log("Logging server is working on ", port);
    });
  } else {
    throw new Error('You need to pass a port or an existing express app');
  }
};
