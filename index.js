require('app-module-path').addPath(__dirname + '/src');
const ansi = require('chalk'),
  Logger = require('./src/logger'),
  express = require('express'),
	bodyParser = require('body-parser'),
  request = require('request');

const logger = new Logger();
let app = express();

logger.init({
  logDir: './logs',
  api: {
    //port: 3015,
    appExpress: app,
    logPrefix: '/logs',
  },
  dbSettings: {
    db: "mongodb://localhost/rt_qt_database",
    username: "",
    password: "",
    options: {
      poolSize: 2,
      autoReconnect: false
    }
  },
  mailSettings: {
    transportOptions: {
      host: 'smtp.mailgun.org',
      port: 25,
      auth: {
        user: 'postmaster@quicktext.im', // generated ethereal user
        pass: 'c0b6cd3bcc40408799306668b2649ba0'  // generated ethereal password
      }
    },
    to: "imen.ammar@satoripop.com",
    from: 'postmaster@quicktext.im'
  }
});
// app.listen(3005, () => {
// });
console.log(JSON.stringify(logger.logTypes));
let string = "hey " + ansi.grey("you") + " %s!";
logger.error(string, "yutut", {context: "NODE", logblock: "block1", x: 2, y: {c: 5}});

//let app = express();
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());
app.use(logger.expressLogging());
app.post('/*', (req, res) => {
  res.send('ok');
});
app.listen(3005, () => {
});

let url = "http://validate.jsontest.com/?json=%5BJSON-code-to-validate%5D";
logger.callRequestLogging(url, 'get', {}, true);
request.get(url, (err, httpResponse, body) => {
  logger.endRequestLogging(url, 'get', err, httpResponse, body, true, false);
});

io = require('socket.io')(3000);
logger.wsLogging(io);
io.on('connection', (socket) => {
  socket.on('test', data => {
  });
});
