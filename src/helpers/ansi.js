/**
 * @module ansi
 * @fileoverview getting ansi color depending on what the terminal supports
 * @license MIT
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */
const chalk = require('chalk');
const supportsColor = require('supports-color');

let ansi = new chalk.constructor({level: 0});
if (supportsColor.stderr.has16m) {
	ansi = new chalk.constructor({level: 3});
} else if (supportsColor.stdout.has256) {
	ansi = new chalk.constructor({level: 2});
} else if (supportsColor.stdout) {
	ansi = new chalk.constructor({level: 1});
}

module.exports = ansi;
