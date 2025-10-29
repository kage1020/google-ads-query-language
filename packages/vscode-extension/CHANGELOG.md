# Changelog

## [0.1.4] - 2025-10-29

### Changed

- Update `@gaql/core` to v0.1.4

## [0.1.3] - 2025-10-26

### Changed

- Update `@gaql/core`

## [0.1.2] - 2025-10-25

## Fixed

- Bug with template literal handling in VS Code extension validation
- Localization issue causing incorrect display of error messages

## [0.1.1] - 2025-10-25

### Fixed

- Bundle @gaql/core module into the extension to fix "Cannot find module '@gaql/core'" error

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

[0.1.4]: https://github.com/kage1020/google-ads-query-language/releases/tag/vscode-extension-v0.1.4
[0.1.3]: https://github.com/kage1020/google-ads-query-language/releases/tag/vscode-extension-v0.1.3
[0.1.2]: https://github.com/kage1020/google-ads-query-language/releases/tag/vscode-extension-v0.1.2
[0.1.1]: https://github.com/kage1020/google-ads-query-language/releases/tag/vscode-extension-v0.1.1
[0.1.0]: https://github.com/kage1020/google-ads-query-language/releases/tag/vscode-extension-v0.1.0
