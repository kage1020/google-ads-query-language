# @gaql/core

Core validation and schema logic for Google Ads Query Language (GAQL).

## Installation

```bash
npm install @gaql/core
```

## Features

- **Schema Management**: Support for Google Ads API v19, v20, and v21
- **Query Validation**: Validate GAQL queries with detailed error messages
- **Parser**: Parse GAQL queries and provide completion suggestions
- **Type Definitions**: TypeScript types for GAQL resources, fields, metrics, and segments

## Usage

### Basic Validation

```typescript
import { validateQuery, setApiVersion } from '@gaql/core';

// Set API version (default: 21)
setApiVersion('21');

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
console.log(result.valid); // true or false
console.log(result.errors); // Array of validation errors
```

### Validate Multiple Queries

```typescript
import { validateText } from '@gaql/core';

const text = `
const query1 = \`
  SELECT campaign.id FROM campaign
\`;

const query2 = \`
  SELECT ad_group.id FROM ad_group
\`;
`;

const results = validateText(text);
for (const result of results) {
  console.log(`Query at line ${result.line}: ${result.valid ? 'Valid' : 'Invalid'}`);
}
```

### Schema Queries

```typescript
import {
  getResourceNames,
  getFieldsForResource,
  getMetricsForResource,
  getSegmentsForResource,
} from '@gaql/core';

// Get all available resources
const resources = getResourceNames();
console.log(resources); // ['campaign', 'ad_group', ...]

// Get fields for a resource
const campaignFields = getFieldsForResource('campaign');
console.log(campaignFields);

// Get metrics for a resource
const metrics = getMetricsForResource('campaign');
console.log(metrics);

// Get segments for a resource
const segments = getSegmentsForResource('campaign');
console.log(segments);
```

### Parser and Completion

```typescript
import { getCompletions, determineContext } from '@gaql/core';

const query = 'SELECT campaign.';
const position = query.length;

// Get context at cursor position
const context = determineContext(query, position);
console.log(context); // 'select_fields'

// Get completion suggestions
const result = getCompletions(query, position);
console.log(result.suggestions);
```

## API Reference

### Schema Functions

- `setApiVersion(version: '19' | '20' | '21')`: Set the Google Ads API version
- `getApiVersion()`: Get the current API version
- `getResourceNames()`: Get all available resource names
- `getFieldsForResource(resource: string)`: Get all fields for a resource
- `getFieldsForResourcePrefix(resource: string, prefix: string)`: Get fields for a specific prefix
- `getResourcePrefixesForResource(resource: string)`: Get all resource prefixes
- `getMetricsForResource(resource: string)`: Get metrics for a resource
- `getSegmentsForResource(resource: string)`: Get segments for a resource

### Validation Functions

- `validateQuery(query: string)`: Validate a single GAQL query
- `validateText(text: string)`: Validate multiple queries in text (extracts from template literals)

### Parser Functions

- `determineContext(query: string, position: number)`: Determine the context at a cursor position
- `getCompletions(query: string, position: number)`: Get completion suggestions
- `extractResource(query: string)`: Extract resource name from a query
- `extractSelectFields(query: string)`: Extract field names from SELECT clause
- `extractWhereFields(query: string)`: Extract field names from WHERE clause

## Types

```typescript
interface FieldDefinition {
  name: string;
  type: string;
  description: string;
  documentation?: string;
}

interface ValidationError {
  type: ValidationErrorType;
  message: string;
  line: number;
  column: number;
  length: number;
  field?: string;
  suggestion?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

type QueryContext =
  | 'keyword'
  | 'select_fields'
  | 'from_clause'
  | 'where_field'
  | 'where_value'
  | 'operator';

interface CompletionItem {
  label: string;
  type: 'keyword' | 'resource' | 'field' | 'operator' | 'value';
  description?: string;
  documentation?: string;
}
```

## Development

### Schema Generation

This package includes a script to extract field definitions from the Google Ads API packages and generate schema files.

```bash
# Manually generate schemas for all supported API versions
pnpm extract
```

**Automatic Schema Generation:**

Schemas are automatically generated before:

- **Building**: `pnpm build` runs `prebuild` hook
- **Testing**: `pnpm test` runs `pretest` hook
- **Publishing**: `pnpm publish` runs `prepublishOnly` → `build` → `prebuild`

This ensures schemas are always up-to-date before building, testing, or publishing.

**How it works:**

The script will:

1. Read type definitions from `google-ads-api-v{version}` packages
2. Extract resource names, fields, metrics, and segments
3. Attempt to load documentation from `protos.d.ts` files
4. Generate `src/schemas/fields-v{version}.json` files

**Requirements:**

- All `google-ads-api-v*` dependencies must be installed
- Schema files are generated in `src/schemas/` directory

**Generated Files:**

- `src/schemas/fields-v19.json` - Google Ads API v19 schema
- `src/schemas/fields-v20.json` - Google Ads API v20 schema
- `src/schemas/fields-v21.json` - Google Ads API v21 schema

## License

MIT
