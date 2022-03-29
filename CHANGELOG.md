# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2] - 2021-03-28
### Added
- RegEx pattern setting for non-Maven output that might at the beginning of each line, to support build system logs that prefix each line of Maven output with information like a date.
### Fixed
- Support additional characters in group ids, artifact ids, and repo ids
- Improve RegExs that match Maven log lines

## [0.0.1] - 2021-03-27
### Added
- Top level of folding (each Maven project as well as the Maven reactor build order, summary, and status)
- Second level of folding (each plugin that runs)
- Third level of folding (each test class run)
- Folding regions for consecutive "downloading..."/"downloaded..." lines, and downloading progress lines
