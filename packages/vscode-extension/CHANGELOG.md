# Changelog

All notable changes to the Google Ads Query Language (GAQL) VSCode Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-10-24

### Added

- Initial release of gaql-vscode
- Real-time GAQL query validation in TypeScript/JavaScript template literals
- Intelligent autocomplete for keywords, resources, fields, metrics, and segments
- Rich IntelliSense with hover information and documentation
- Code actions for quick fixes and suggestions
- Multi-language support (English and Japanese)
- Support for Google Ads API v19, v20, and v21
- Activation control via comment directives (`@gaql`, `@gaql-enable`, `@gaql-disable`, `@gaql-disable-next-line`)
- Configuration options:
  - `gaql.enabled` - Enable/disable validation
  - `gaql.activationMode` - Control default activation behavior
  - `gaql.apiVersion` - Select API version (19/20/21)
  - `gaql.language` - Select UI language (auto/en/ja)
- Integration with @gaql/core for validation logic
- 15 comprehensive tests for localization

### Features

- Detects missing SELECT/FROM clauses
- Validates resource names and field names
- Provides detailed error messages with line/column information
- Suggests similar field names for typos (Levenshtein distance)
- Context-aware completion suggestions
- File-level and line-level activation directives

---

[0.1.0]: https://github.com/kage1020/google-ads-query-language/releases/tag/vscode-extension-v0.1.0
