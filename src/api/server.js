/**
 * @module server
 * @fileoverview Express server manager for logging api
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */

const _ = require('lodash');

/**
 * api route to get logs
 * @param  {object} logger logger instance
 * @param  {object} app    express app
 * @param  {string} routeName route name
 */
const route = (logger, app, routeName)=> {
  app.get(routeName, (req, res) => {
    const {context, logblock, type, level} = req.query;
    const options = {
      from: new Date() - ( 3 * 24 * 60 * 60 * 1000),
      until: new Date(),
      limit: 100,
      start: 0,
      context,
      logblock,
      type,
      level,
      order: 'desc',
      fields: ['content', 'timestamp', 'context', 'logblock', 'type', 'level']
    };
    logger.listLog(options)
      .then(results => {
        res.json(results);
      })
      .catch(err => {
        console.log(err);
        res.send(err);
      });
	});
};
/**
 * launching express server for api Logging
 * @param  {object}  logger         logger instance
 * @param  {object}  api.appExpress express app
 * @param  {string}  api.logRoute   route name for listing logs
 * @param  {integer} api.port       port for the express app
 */
module.exports = (logger, api) => {
  let routeName = api.logRoute || '/';
  // pass express app
  if (api.appExpress && !_.isEmpty(api.appExpress)) {
    route(logger, api.appExpress, routeName);
  // create express app
} else if (api.port) {
    const express = require('express');
    let app = express();
    route(logger, app, routeName);
    app.listen(api.port, () => {
      console.log("Logging server is working on ", api.port);
    });
  } else {
    throw new Error('You need to pass a port or an existing express app');
  }
};
