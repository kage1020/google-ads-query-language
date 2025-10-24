# Google Ads Query Language (GAQL) for VS Code

Language support for Google Ads Query Language (GAQL) with validation, autocomplete, IntelliSense, and diagnostics.

![](images/demo.gif)

## Features

### ✅ Real-time Validation

- Validates GAQL queries in TypeScript/JavaScript template literals
- Detects missing SELECT/FROM clauses
- Validates resource names and field names
- Provides detailed error messages with line/column information

### 💡 Intelligent Autocomplete

- Context-aware suggestions for keywords, resources, fields, metrics, and segments
- Filters suggestions based on the selected resource
- Supports all Google Ads API versions (v19, v20, v21)

### 🔍 Rich IntelliSense

- Hover information for fields and resources
- Field type information and descriptions
- Quick documentation access

### 🛠️ Code Actions

- Quick fixes for common issues
- Disable validation for specific lines or entire files
- Suggestions for similar field names (typo correction)

### 🎯 Activation Control

- Fine-grained control with comment directives:
  - `// @gaql` or `// @gaql-enable` - Enable for following queries
  - `// @gaql-disable` - Disable for following queries
  - `// @gaql-disable-next-line` - Disable for the next query only
- Global activation mode setting

### 🌍 Multi-language Support

- English
- Japanese (日本語)
- Automatically detects VS Code language settings

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Google Ads Query Language" or "gaql-vscode"
4. Click Install

### From VSIX File

1. Download the `.vsix` file from [Releases](https://github.com/kage1020/google-ads-query-language/releases)
2. Open VS Code
3. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
4. Run `Extensions: Install from VSIX...`
5. Select the downloaded VSIX file

## Usage

The extension automatically activates for TypeScript and JavaScript files. Write GAQL queries in template literals:

```typescript
// Enable GAQL validation for this query
// @gaql
const query = `
  SELECT
    campaign.id,
    campaign.name,
    metrics.impressions,
    metrics.clicks
  FROM campaign
  WHERE campaign.status = "ENABLED"
`;
```

### Activation Modes

#### Always Mode (Default behavior: Active)

```typescript
// Validation is active by default
const query = `SELECT campaign.id FROM campaign`;

// Disable for specific query
// @gaql-disable
const rawQuery = `This won't be validated`;
```

#### On-Demand Mode (Default behavior: Inactive)

```typescript
// Validation is inactive by default
const ignored = `SELECT invalid syntax`;

// Enable for specific query
// @gaql
const validated = `SELECT campaign.id FROM campaign`;
```

## Configuration

Access settings via: **File > Preferences > Settings** (or **Code > Settings** on macOS), then search for "gaql"

### Available Settings

#### `gaql.enabled`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable/disable GAQL validation and autocompletion

#### `gaql.activationMode`

- **Type**: `string` (`"always"` | `"onDemand"`)
- **Default**: `"onDemand"`
- **Description**: Default behavior when no comment directive is present
  - `always`: Active by default, can be disabled with `@gaql-disable`
  - `onDemand`: Inactive by default, can be enabled with `@gaql` or `@gaql-enable`

#### `gaql.apiVersion`

- **Type**: `string` (`"19"` | `"20"` | `"21"`)
- **Default**: `"21"`
- **Description**: Google Ads API version to use for schema and validation
  - `19`: Supported until February 2026
  - `20`: Supported until June 2026
  - `21`: Supported until August 2026

#### `gaql.language`

- **Type**: `string` (`"auto"` | `"en"` | `"ja"`)
- **Default**: `"auto"`
- **Description**: Language for error messages and UI text
  - `auto`: Automatically detect from VS Code
  - `en`: English
  - `ja`: Japanese (日本語)

## Related Packages

This extension is part of the GAQL Tools monorepo:

- **[@gaql/core](https://www.npmjs.com/package/@gaql/core)**: Core validation, schema, and parser library
- **[@gaql/cli](https://www.npmjs.com/package/@gaql/cli)**: Command-line tool for validating GAQL queries in files
- **gaql-vscode** (this extension): VS Code language support

## Development

This extension is built with:

- TypeScript 5.9
- Vite 7.1 (for bundling)
- Biome 2.2 (for linting/formatting)
- @gaql/core (for validation logic)

### Building from Source

```bash
# Clone the repository
git clone https://github.com/kage1020/google-ads-query-language.git
cd google-ads-query-language

# Install dependencies
pnpm install

# Build the extension
pnpm --filter gaql-vscode build

# Package the extension
pnpm --filter gaql-vscode package
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/kage1020/google-ads-query-language/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kage1020/google-ads-query-language/discussions)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history.

---

🤖 Built with [Claude Code](https://claude.com/claude-code)
