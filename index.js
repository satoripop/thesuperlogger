require('app-module-path').addPath(__dirname + '/src');
const ansi = require('chalk'),
	Logger = require('./src/logger'),
	express = require('express'),
	bodyParser = require('body-parser'),
	request = require('request');
require('dotenv-extended').load();

const logger = new Logger();
let app = express();

logger.init({
	logDir: './logs',
	api: {
		//port: 3015,
		appExpress: app,
		logPrefix: '/logs',
	},
	// dbSettings: {
	//   db: "mongodb://localhost/rt_qt_database",
	//   options: {
	//     poolSize: 2,
	//     autoReconnect: false
	//   }
	// },
	// mailSettings: {
	//   transportOptions: {
	//     host: 'smtp.mailgun.org',
	//     port: 25,
	//     auth: {
	//       user: 'postmaster@quicktext.im', // generated ethereal user
	//       pass: 'c0b6cd3bcc40408799306668b2649ba0'  // generated ethereal password
	//     }
	//   },
	//   to: "imen.ammar@satoripop.com",
	//   from: 'postmaster@quicktext.im'
	// }
});
// app.listen(3005, () => {
// });
//console.log(JSON.stringify(logger.logTypes));
//
let logblock = new logger.Logblock('index.js');
const testFunction = () => {
	let string = 'hey ' + ansi.grey('you') + ' %s %s!';
	logblock.error(string, 'yutut', {test: 1}, {context: 'NODE', x: 2, y: {c: 5}});
};
// testFunction();
// testFunction();

Promise.all([testFunction(), testFunction()]);
//let app = express();
// app.use(bodyParser.urlencoded({
// 	extended: true
// }));
// app.use(bodyParser.json());
// app.use(logger.expressLogging());
// app.post('/*', (req, res) => {
//   res.send('ok');
// });
// app.listen(3005, () => {
// });
//
let url = 'http://validate.jsontest.com/?json=%5BJSON-code-to-validate%5D';
logger.info("I'm one of a kind", {logblock: "yo"});
logger.info("I'm lifeless",);
logger.callRequestLogging(url, 'get', {}, true);
request.get(url, (err, httpResponse, body) => {
	logger.endRequestLogging(url, 'get', err, httpResponse, body, true, false);
	logblock.info('all part of the same shit!');
});
//
// io = require('socket.io')(3000);
// logger.wsLogging(io);
// io.on('connection', (socket) => {
//   socket.on('test', data => {
//   });
// });
