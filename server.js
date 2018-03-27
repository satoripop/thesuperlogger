const _ = require('lodash');
const Logger = require('./src/logger');
/*
  Gettings args
 */
let port = process.argv[2];
if(_.isEmpty(port)){
	throw 'You need to specify a port for your super-logger api';
}
let dbString = process.argv[3];
if(_.isEmpty(dbString)){
	throw 'You need to specify you database string connection for your super-logger app';
}
let logPrefix = process.argv[4] || '/logs';
let collection = process.argv[5] || 'log';

/*
 Create fake logger
 */
const fakeLogger = new Logger();
fakeLogger.init({
	logDir: './fakeLogs',
	api: {
		port,
		logPrefix,
	},
	dbSettings: {
		db: dbString,
		collection,
	},
});
