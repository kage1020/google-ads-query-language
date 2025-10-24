import {
  type FieldDefinition,
  GAQL_KEYWORDS,
  getFieldsForResource,
  getFieldsForResourcePrefix,
  getResourceNames,
  OPERATORS,
  STATUS_VALUES,
} from './schema.js';

/**
 * Query context types
 */
export type QueryContext =
  | 'keyword' // GAQL command (SELECT, FROM, WHERE, etc.)
  | 'select_fields' // Field selection context
  | 'from_clause' // Resource specification
  | 'where_field' // Filter field identification
  | 'where_value' // Constraint value input
  | 'operator'; // Comparison operator

/**
 * Completion suggestion
 */
export interface CompletionItem {
  label: string;
  type: 'keyword' | 'resource' | 'field' | 'operator' | 'value';
  description?: string;
  documentation?: string;
}

/**
 * Parse result with context and suggestions
 */
export interface ParseResult {
  context: QueryContext;
  suggestions: CompletionItem[];
  resource?: string;
  prefix?: string;
}

/**
 * Determine the query context at a given position
 * @param query The GAQL query string
 * @param position The cursor position (0-based index)
 * @returns The current query context
 */
export function determineContext(query: string, position: number): QueryContext {
  const beforeCursor = query.substring(0, position);
  const trimmed = beforeCursor.trim();

  // Check if we're in a WHERE clause looking for a field
  if (/WHERE\s+\w*$/i.test(trimmed)) {
    return 'where_field';
  }

  // Check if we're after a comma (continuing field list)
  if (/,\s*$/i.test(trimmed)) {
    return 'select_fields';
  }

  // Check if we're in FROM clause
  if (/FROM\s+\w*$/i.test(trimmed)) {
    return 'from_clause';
  }

  // Check if we're after an operator (looking for value)
  if (
    new RegExp(
      `(${OPERATORS.join('|').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s+\\w*$`,
      'i',
    ).test(trimmed)
  ) {
    return 'where_value';
  }

  // Check if we're after a field in WHERE (looking for operator)
  if (/WHERE\s+[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*\s+\w*$/i.test(trimmed)) {
    return 'operator';
  }

  // Check if we're in SELECT clause (after SELECT keyword)
  if (/SELECT\s+[^FROM]*$/i.test(trimmed) && !/FROM/i.test(trimmed)) {
    return 'select_fields';
  }

  // Default to keyword context
  return 'keyword';
}

/**
 * Get completion suggestions for the current context
 * @param query The GAQL query string
 * @param position The cursor position (0-based index)
 * @returns Parse result with suggestions
 */
export function getCompletions(query: string, position: number): ParseResult {
  const context = determineContext(query, position);
  const beforeCursor = query.substring(0, position);

  switch (context) {
    case 'keyword':
      return {
        context,
        suggestions: GAQL_KEYWORDS.map((keyword) => ({
          label: keyword,
          type: 'keyword',
          description: `GAQL keyword: ${keyword}`,
        })),
      };

    case 'from_clause':
      return {
        context,
        suggestions: getResourceNames().map((resource) => ({
          label: resource,
          type: 'resource',
          description: `Google Ads resource: ${resource}`,
        })),
      };

    case 'operator':
      return {
        context,
        suggestions: OPERATORS.map((op) => ({
          label: op,
          type: 'operator',
          description: `Comparison operator: ${op}`,
        })),
      };

    case 'where_value':
      return {
        context,
        suggestions: STATUS_VALUES.map((value) => ({
          label: value,
          type: 'value',
          description: `Status value: ${value}`,
        })),
      };

    case 'select_fields':
    case 'where_field': {
      // Extract resource name from FROM clause
      const fromMatch = query.match(/\bFROM\s+(\w+)/i);
      if (!fromMatch) {
        return { context, suggestions: [] };
      }

      const resource = fromMatch[1];

      // Extract the current field path being typed
      const fieldMatch = beforeCursor.match(/([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)*)$/i);
      const typedPath = fieldMatch ? fieldMatch[1] : '';

      // Get field suggestions based on typed path
      const suggestions = getFieldSuggestions(resource, typedPath);

      return {
        context,
        resource,
        prefix: typedPath,
        suggestions,
      };
    }

    default:
      return { context, suggestions: [] };
  }
}

/**
 * Get field suggestions based on the resource and typed path
 * @param resource The resource name from FROM clause
 * @param typedPath The partially typed field path
 * @returns Array of completion items
 */
function getFieldSuggestions(resource: string, typedPath: string): CompletionItem[] {
  const allFields = getFieldsForResource(resource);

  if (!typedPath || !typedPath.includes('.')) {
    // No prefix yet, show all fields
    return allFields.map((field) => fieldToCompletionItem(field));
  }

  // Split the typed path
  const segments = typedPath.split('.');
  const prefix = segments.slice(0, -1).join('.');

  // Get fields for the specific prefix
  const prefixFields = prefix ? getFieldsForResourcePrefix(resource, prefix) : allFields;

  // Filter fields that start with the typed path
  const matchingFields = prefixFields.filter((field) =>
    field.description.startsWith(typedPath.toLowerCase()),
  );

  // Extract next logical segment and deduplicate
  const nextSegments = new Map<string, FieldDefinition>();
  for (const field of matchingFields) {
    const remaining = field.description.substring(typedPath.length);
    const nextDot = remaining.indexOf('.');
    const nextSegment = nextDot > 0 ? remaining.substring(0, nextDot) : remaining;

    if (nextSegment && !nextSegments.has(nextSegment)) {
      nextSegments.set(nextSegment, field);
    }
  }

  return Array.from(nextSegments.values()).map((field) => fieldToCompletionItem(field));
}

/**
 * Convert FieldDefinition to CompletionItem
 */
function fieldToCompletionItem(field: FieldDefinition): CompletionItem {
  return {
    label: field.description,
    type: 'field',
    description: `${field.type}: ${field.description}`,
    documentation: field.documentation,
  };
}

/**
 * Extract resource name from a GAQL query
 * @param query The GAQL query string
 * @returns The resource name or undefined
 */
export function extractResource(query: string): string | undefined {
  const fromMatch = query.match(/\bFROM\s+(\w+)/i);
  return fromMatch ? fromMatch[1] : undefined;
}

/**
 * Extract field names from SELECT clause
 * @param query The GAQL query string
 * @returns Array of field names
 */
export function extractSelectFields(query: string): string[] {
  const selectMatch = query.match(/\bSELECT\s+(.+?)\s+FROM/is);
  if (!selectMatch) return [];

  return selectMatch[1]
    .split(',')
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
}

/**
 * Extract field names from WHERE clause
 * @param query The GAQL query string
 * @returns Array of field names
 */
export function extractWhereFields(query: string): string[] {
  const whereMatch = query.match(/\bWHERE\s+(.+?)(\s+ORDER\s+BY|\s+LIMIT|$)/is);
  if (!whereMatch) return [];

  const fieldRegex = /([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)/gi;
  return whereMatch[1].match(fieldRegex) || [];
}
