# Google Ads Query Language (GAQL) Tools

TypeScript autocomplete and CLI tools for Google Ads Query Language (GAQL).

## Packages

This is a monorepo containing the following packages:

### [@gaql/core](./packages/core)

Core validation and schema logic for GAQL. This package provides:

- **Schema Management**: Support for Google Ads API v19, v20, and v21
- **Query Validation**: Validate GAQL queries with detailed error messages
- **Parser**: Parse GAQL queries and provide completion suggestions
- **Type Definitions**: TypeScript types for GAQL resources, fields, metrics, and segments

### [@gaql/cli](./packages/cli)

Command-line interface for GAQL validation.

```bash
# Install globally
npm install -g @gaql/cli

# Or use with npx
npx @gaql/cli validate query.ts
```

### [gaql-vscode](./packages/vscode-extension)

VS Code extension for GAQL with validation, autocomplete, IntelliSense, and diagnostics.

- Search "Google Ads Query Language" in VS Code Extensions marketplace
- Or install from [VS Code Marketplace](https://marketplace.visualstudio.com/)

## Quick Start

### CLI Usage

```bash
# Validate GAQL queries in a file
gaql validate query.ts

# Validate from stdin
echo "SELECT campaign.id FROM campaign" | gaql validate

# Specify API version
gaql validate query.ts --api-version 21

# Output in JSON format
gaql validate query.ts --format json
```

### Programmatic Usage

```typescript
import { validateQuery } from '@gaql/core';

// Validate a query
const query = `
  SELECT
    campaign.id,
    campaign.name,
    metrics.clicks
  FROM campaign
  WHERE campaign.status = 'ENABLED'
`;

const result = validateQuery(query);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

## Features

- ✅ **Multi-version Support**: Google Ads API v19, v20, and v21
- ✅ **Comprehensive Validation**: Validate resources, fields, metrics, and segments
- ✅ **Detailed Error Messages**: Get precise error locations with suggestions
- ✅ **VS Code Extension**: Real-time validation, autocomplete, and IntelliSense
- ✅ **CLI Tool**: Validate queries from files or stdin
- ✅ **JSON Output**: Machine-readable validation results
- ✅ **Type-safe**: Full TypeScript support
- ✅ **Multi-language**: English and Japanese support

## Development

This project uses:

- **Turborepo**: Monorepo management
- **pnpm**: Package manager
- **TypeScript**: Type-safe development
- **Biome**: Linting and formatting
- **Vitest**: Testing framework

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run linter
pnpm lint

# Run tests
pnpm test

# Format code
pnpm format
```

## Project Structure

```
google-ads-query-language/
├── packages/
│   ├── core/              # @gaql/core - Core validation & schema logic
│   ├── cli/               # @gaql/cli - CLI tool
│   └── vscode-extension/  # gaql-vscode - VS Code extension
├── turbo.json             # Turborepo config
├── package.json           # Root package.json
└── pnpm-workspace.yaml    # Workspace config
```

## License

MIT
