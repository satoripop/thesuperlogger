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
		let { context, content, logblock, type, level, page, until, from, order, source } = req.query;

		let validUntil = until && moment(until).isValid();
		let _until = validUntil ? moment(until).toDate() : moment().toDate();

		let validFrom = from && moment(from).isValid() &&  moment(until).isAfter(moment(from));
		let _from = validFrom ? moment(from).toDate() : moment(until).subtract(30, 'days').toDate();

		order = order || -1;

		page = page || 0;
		const pageSize = 10;
		const start = page * pageSize;
		const options = {
			from: _from,
			until: _until,
			limit: pageSize,
			start,
			content,
			context,
			logblock,
			type,
			level,
			source,
			order: parseInt(order) >= 0 ? 'asc' : 'desc',
			fields: ['content', 'timestamp', 'context', 'logblock', 'type', 'level', 'source'],
		};
		logger._listLog(options)
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
		let { content, context, logblock, type, level, page, source } = req.query;
		page = page || 0;
		const pageSize = 10;
		const start = page * pageSize;
		const options = {
			from: new Date() - (30 * 24 * 60 * 60 * 1000),
			until: new Date(),
			limit: pageSize,
			start,
			content,
			context,
			logblock,
			type,
			level,
			source,
			order: 'desc',
			fields: ['content', 'timestamp', 'context', 'type', 'level', 'source'],
			group: 'logblock',
		};
		logger._listLog(options)
			.then(results => {
				res.json(results);
			})
			.catch(err => {
				console.log(err);
				res.send(err);
			});
	});
};
