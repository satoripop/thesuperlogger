/**
 * @module routes
 * @fileoverview Express server routes declaration
 * @license MIT
 * @author Ghassen Rjab <ghassen.rjab@satoripop.com>
 */

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
    const { context, logblock, type, level } = req.query;
    const options = {
      from: new Date() - (3 * 24 * 60 * 60 * 1000),
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
  // Grouped by logblock route
  const groupedRoute = `${routesPrefix}/by-block`;
  app.get(groupedRoute, (req, res) => {
    const { context, logblock, type, level } = req.query;
    const options = {
      from: new Date() - (3 * 24 * 60 * 60 * 1000),
      until: new Date(),
      limit: 100,
      start: 0,
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
