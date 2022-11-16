# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2022-11-15
### Changed
- Improved folding logic of downloading section when only a single artifact is downloaded
- Only include specific debug lines in downloading region
- Include "Could not transfer metadata" into downloading region

## [0.1.1] - 2022-11-14
### Changed
- Update Future Enhancements section of README

## [0.1.0] - 2022-11-13
### Added
- Logical folding for maven log in debug mode
- Fold lines emitted directly to stdout and stderr (missing log level at start of line)
- Fold indented debug lines
- Fold error lines
### Changed
- Improved Downloading/Progress/Downloaded log lines behavior
### Fixed
- Fixed bug in detecting Reactor Summary section

## [0.0.3] - 2022-04-10
### Removed
- Remove support for logs with ANSI escape/color codes ([#1](https://github.com/baincd/vscode-maven-log-folding-and-colors/issues/1))
### Changed
- Minor improvements to RegExs that match Maven log lines
- Refactored internals to improve maintainability and to support future planned features

## [0.0.2] - 2022-03-28
### Added
- RegEx pattern setting for non-Maven output that might at the beginning of each line, to support build system logs that prefix each line of Maven output with information like a date.
### Fixed
- Support additional characters in group ids, artifact ids, and repo ids
- Improve RegExs that match Maven log lines

## [0.0.1] - 2022-03-27
### Added
- Top level of folding (each Maven project as well as the Maven reactor build order, summary, and status)
- Second level of folding (each plugin that runs)
- Third level of folding (each test class run)
- Folding regions for consecutive "downloading..."/"downloaded..." lines, and downloading progress lines
