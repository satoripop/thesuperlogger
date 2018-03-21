/**
 * @module 'test-winston-console'
 * @fileoverview test file to test winston-console transport
 * @license MIT
 * @author charlie@nodejitsu.com (Charlie Robbins)
 * @author imen.ammar@satoripop.tn (Imen Ammar)
 */

const path = require('path');
const assume = require('assume');
const { LEVEL, MESSAGE } = require('triple-beam');
const winston = require('winston');
const shortid = require('shortid');
const winstonConsole = require('../src/transports/winston-console');
const stdMocks = require('std-mocks');

const {levels} = require('../src/helpers/levelsSettings');

const transports = {
	defaults: new winstonConsole(),
	noStderr: new winstonConsole({ stderrLevels: [] }),
	debugStdout: new winstonConsole({ debugStdout: true }),
	stderrLevels: new winstonConsole({
		stderrLevels: ['info', 'warn'],
	}),
};

/**
 * Returns a function that asserts the `transport` has the specified
 * `stderrLevels`.
 *
 * @param  {TransportStream} transport Transport to assert against
 * @param  {Array} stderrLevels Set of levels assumed to exist
 * @return {function} Assertion function to execute comparison
 */
function assertStderrLevels(transport, stderrLevels) {
	return () => {
		assume(JSON.stringify(Object.keys(transport.stderrLevels).sort()))
			.equals(JSON.stringify(stderrLevels.sort()));
	};
}

describe('Console transport', () => {
	describe('with defaults', () => {
		it('should set stderrLevels to [\'error\', \'debug\'] by default', assertStderrLevels(
			transports.defaults,
			['error', 'debug']
		));

		it('logs all levels (EXCEPT error and debug) to stdout', () => {
			stdMocks.use();
			transports.defaults.levels = levels;
			Object.keys(levels)
				.forEach((level) => {
					const info = {
						[LEVEL]: level,
						message: `This is level ${level}`,
						level,
						context: 'TEST',
						logblock:'test-block-' + shortid.generate(),
					};

					info[MESSAGE] = JSON.stringify(info);
					transports.defaults.log(info);
				});

			stdMocks.restore();
			var output = stdMocks.flush();
			assume(output.stderr).is.an('array');
			assume(output.stderr).length(2);
			assume(output.stdout).is.an('array');
			assume(output.stdout).length(6);
		});
	});

	describe('throws an appropriate error when', () => {
		it('if both debugStdout and stderrLevels are set { debugStdout, stderrLevels }', () => {
			assume(() => {
				let throwing = new winstonConsole({
					stderrLevels: ['foo', 'bar'],
					debugStdout: true,
				});
			}).throws(/Cannot set debugStdout and stderrLevels/);
		});

		it('if stderrLevels is set, but not an Array { stderrLevels: \'Not an Array\' }', () => {
			assume(() => {
				let throwing = new winstonConsole({
					stderrLevels: 'Not an Array',
					debugStdout: false,
				});
			}).throws(/Cannot set stderrLevels to type other than Array/);
		});

		it('if stderrLevels contains non-string elements { stderrLevels: [\'good\', /^invalid$/, \'valid\']', () => {
			assume(() => {
				let throwing = new winstonConsole({
					stderrLevels: ['good', /^invalid$/, 'valid'],
					debugStdout: false,
				});
			}).throws(/Cannot have non-string elements in stderrLevels Array/);
		});
	});

	it('{ stderrLevels: [\'info\', \'warn\'] } logs to them appropriately', assertStderrLevels(
		transports.stderrLevels,
		['info', 'warn']
	));

	require('./abstract-transport')({
		name: '',
		Transport: winstonConsole,
	});
});
