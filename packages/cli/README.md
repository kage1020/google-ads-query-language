# @gaql/cli

Command-line interface for Google Ads Query Language (GAQL) validation.

## Installation

```bash
# Install globally
npm install -g @gaql/cli

# Or use with npx
npx @gaql/cli validate query.ts
```

## Usage

### Basic Validation

```bash
# Validate GAQL queries in a file
gaql validate query.ts

# Validate from stdin
echo "SELECT campaign.id FROM campaign" | gaql validate

# Validate with pipe
cat query.ts | gaql validate
```

### Options

```bash
# Specify API version (19, 20, or 21)
gaql validate query.ts --api-version 21

# Output in JSON format
gaql validate query.ts --format json

# Disable colored output
gaql validate query.ts --no-color

# Show help
gaql validate --help
```

## Examples

### Example 1: Validate a TypeScript file

```typescript
// query.ts
const query = `
  SELECT
    campaign.id,
    campaign.name,
    metrics.clicks
  FROM campaign
  WHERE campaign.status = 'ENABLED'
`;
```

```bash
gaql validate query.ts
```

Output:

```
✔ Read file: query.ts

=== GAQL Validation Results ===

Total queries: 1
✓ Valid: 1

✓ Query at line 2: Valid
```

### Example 2: Invalid query with suggestions

```typescript
// invalid.ts
const query = `
  SELECT
    campaign.invalid_field,
    metrics.clicks
  FROM campaign
`;
```

```bash
gaql validate invalid.ts
```

Output:

```
✔ Read file: invalid.ts

=== GAQL Validation Results ===

Total queries: 1
✗ Invalid: 1

✗ Query at line 2: Invalid
  Query:
    SELECT
        campaign.invalid_field,
        metrics.clicks
      FROM campaign

  Errors:
    • Invalid field: campaign.invalid_field for resource campaign
      Suggestion: campaign.id
```

### Example 3: JSON output for CI/CD

```bash
gaql validate query.ts --format json
```

Output:

```json
{
  "totalQueries": 1,
  "validQueries": 1,
  "invalidQueries": 0,
  "results": [
    {
      "query": "SELECT campaign.id FROM campaign",
      "line": 2,
      "valid": true,
      "errors": []
    }
  ]
}
```

## Exit Codes

- `0`: All queries are valid
- `1`: At least one query is invalid or an error occurred

## Integration

### Git Hooks

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/sh
gaql validate src/**/*.ts --no-color
```

### CI/CD

```yaml
# .github/workflows/validate.yml
name: Validate GAQL Queries

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g @gaql/cli
      - run: gaql validate src/**/*.ts --format json
```

## License

MIT
