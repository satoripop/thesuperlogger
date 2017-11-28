require('app-module-path').addPath(__dirname + '/src');
const ansi = require('chalk'),
  Logger = require('./src/logger'),
  express = require('express'),
  request = require('request');

const logger = new Logger();

logger.init({
  logDir: './logs',
  port: 3000,
  db: "mongodb://localhost/rt_qt_database",
  username: "",
  password: "",
  options: {
    poolSize: 2,
    autoReconnect: false
  }
});

let string = "hey " + ansi.grey("you") + " %s!";
logger.error(string, "yutut", {context: "NODE", logblock: "block1", x: 2, y: {c: 5}});

let app = express();
app.use(logger.expressLogging());
app.post('/*', (req, res) => {
  res.send('ok');
});
app.listen(3000, () => {
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
