require('app-module-path').addPath(__dirname + '/src');
const ansi = require('chalk'),
  Logger = require('./src/logger');

const logger = new Logger();

logger.init({
  db: "mongodb://localhost/rt_qt_database",
  username: "",
  password: "",
  options: {
    poolSize: 2,
    autoReconnect: false
  }
});
let string = "hey " + ansi.grey("you") + " %s!";
logger.error(string, "yutut", {x: 2, y: {c: 5}});
