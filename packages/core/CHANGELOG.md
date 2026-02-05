# Changelog

## [0.1.4] - 2026-02-05

### Changed

- Update dependencies

## [0.1.3] - 2025-10-26

### Added

- Exported `SupportedApiVersions` constant for use in other packages

## [0.1.2] - 2025-10-25

### Fixed

- Bug with template literal handling in validation

## [0.1.1] - 2025-10-25

### Changed

- Added `main`, `module`, and `types` fields to package.json for better compatibility with bundlers and older tools

## [0.1.0] - 2025-10-24

### Added

- Initial release of @gaql/core
- Schema management for Google Ads API v19, v20, and v21
- GAQL query validation with detailed error reporting
- Query parser with context-aware completions
- TypeScript type definitions
- Support for resources, fields, metrics, and segments
- Levenshtein distance-based field suggestions
- VS Code-independent validation logic

### Features

- `setApiVersion()` / `getApiVersion()` - API version management
- `getResourceNames()` - Get available resource names
- `getFieldsForResource()` - Get fields for a specific resource
- `getMetricsForResource()` - Get metrics for a resource
- `getSegmentsForResource()` - Get segments for a resource
- `validateQuery()` - Validate single GAQL query
- `validateText()` - Validate multiple queries from text
- `getCompletions()` - Get context-aware completion suggestions
- `determineContext()` - Determine cursor context in query
- `extractResource()` / `extractSelectFields()` / `extractWhereFields()` - Query element extraction

### Development

- Schema extraction script (`pnpm extract`) to generate field definitions from Google Ads API packages
- Automatic schema generation before build, test, and publish via lifecycle hooks
- Support for pnpm, npm, and yarn package managers
- Documentation extraction from protos.d.ts files
- 77 comprehensive tests covering schema, validation, and parser functionality

---

[0.1.4]: https://github.com/kage1020/google-ads-query-language/releases/tag/core-v0.1.4
[0.1.3]: https://github.com/kage1020/google-ads-query-language/releases/tag/core-v0.1.3
[0.1.2]: https://github.com/kage1020/google-ads-query-language/releases/tag/core-v0.1.2
[0.1.1]: https://github.com/kage1020/google-ads-query-language/releases/tag/core-v0.1.1
[0.1.0]: https://github.com/kage1020/google-ads-query-language/releases/tag/core-v0.1.0
