/**
 * @module routes
 * @fileoverview Express server routes declaration
 * @license MIT
 * @author Ghassen Rjab <ghassen.rjab@satoripop.com>
 */

const moment = require('moment');

/**
 * api routes to get logs
 * @param  {object} logger logger instance
 * @param  {object} app    express app
 * @param  {string} routesPrefix routes prefix
 */
module.exports.routes = (logger, app, routesPrefix) => {
  // Main route
  const mainRoute = `${routesPrefix}`;
  app.get(mainRoute, (req, res) => {
    let { context, logblock, type, level, page, until, from, order } = req.query;

    let validUntil = until && moment(until).isValid();
    let _until = validUntil ? moment(until).toDate() : moment().toDate();

    let validFrom = from && moment(from).isValid() &&  moment(until).isAfter(moment(from));
    let _from = validFrom ? moment(from).toDate() : moment(until).subtract(30, "days").toDate();

    order = order || 1;

    page = page || 0;
    const pageSize = 10;
    const start = page * pageSize;
    const limit = start + pageSize;
    const options = {
      from: _from,
      until: _until,
      limit,
      start,
      context,
      logblock,
      type,
      level,
      order: parseInt(order) >= 0 ? 'asc' : 'desc',
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
  // Grouped by logblock route
  const groupedRoute = `${routesPrefix}/by-block`;
  app.get(groupedRoute, (req, res) => {
    let { context, logblock, type, level, page } = req.query;
    page = page || 0;
    const pageSize = 10;
    const start = page * pageSize;
    const limit = start + pageSize;
    const options = {
      from: new Date() - (30 * 24 * 60 * 60 * 1000),
      until: new Date(),
      limit,
      start,
      context,
      logblock,
      type,
      level,
      order: 'desc',
      fields: ['content', 'timestamp', 'context', 'type', 'level'],
      group: 'logblock'
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
