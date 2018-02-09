# Changelog
All notable changes to super-logger will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [1.0.0-rc3] - 2018-02-09
### Added
- Mail transport
- bodyparser mention

### Fixed
- uncaught exceptions handling with mongodb logging

## [1.0.0-rc2] - 2018-02-03
### Added
- log types to module exports
- console transports
- call to console request
- Todos in readme
- handle uncaught exceptions
- timestamp to console
- read html log files from api routes
- status to log response
- individual wrapper functions for levels

### Changed
- file structure

### Fixed
- Fix name and version
- level settings file path Fixed
- merge body with log meta
- fix circular objects in console log

## [1.0.0-rc1] - 2017-12-04
### Added
- mongodb winston transport
- API to list logs
- request Logging
- websocket event logging
- logblock, context and type concepts to all logs
