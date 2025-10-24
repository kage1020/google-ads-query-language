# Changelog

## [0.1.0] - 2025-10-24

### Added

- Initial release of @gaql/cli
- Command-line interface for GAQL validation
- Support for file and stdin input
- Multiple output formats (text, JSON)
- Color-coded terminal output
- Integration with @gaql/core for validation logic
- Support for Google Ads API v19, v20, and v21

### Commands

- `gaql validate <file>` - Validate GAQL queries from file
- `gaql validate` - Validate GAQL queries from stdin

### Options

- `--api-version <version>` - Specify API version (19/20/21)
- `--format <format>` - Output format (text/json)
- `--no-color` - Disable colored output

### Features

- Friendly error messages with suggestions
- Loading spinners for better UX
- Detailed validation results
- Template literal query extraction

---

[0.1.0]: https://github.com/kage1020/google-ads-query-language/releases/tag/cli-v0.1.0
