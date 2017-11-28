/**
 * @module routes
 * @fileoverview Api routes
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */

module.exports = function(logger, app) {
  app.get('/', (req, res) => {
    logger.listLog()
      .then(results => {
        res.json(results);
      })
      .catch(err => {
        console.log(err);
        res.send(err);
      });
	});
};
