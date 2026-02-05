import {
  type FieldDefinition,
  GAQL_KEYWORDS,
  getFieldsForResource,
  getFieldsForResourcePrefix,
  getResourceNames,
  OPERATORS,
  type ResourceName,
  STATUS_VALUES,
  type SupportedApiVersion,
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
export function getCompletions<T extends SupportedApiVersion>(
  query: string,
  position: number,
  version: T,
): ParseResult {
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
        suggestions: getResourceNames(version).map((resource) => ({
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

      const resource = fromMatch[1] as ResourceName<T>;

      // Extract the current field path being typed
      const fieldMatch = beforeCursor.match(/([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)*)$/i);
      const typedPath = fieldMatch ? fieldMatch[1] : '';

      // Get field suggestions based on typed path
      const suggestions = getFieldSuggestions(resource, typedPath, version);

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
function getFieldSuggestions<T extends SupportedApiVersion>(
  resource: ResourceName<T>,
  typedPath: string,
  version: T,
): CompletionItem[] {
  const allFields = getFieldsForResource(resource, version);

  if (!typedPath || !typedPath.includes('.')) {
    // No prefix yet, show all fields
    return allFields.map((field) => fieldToCompletionItem(field));
  }

  // Split the typed path
  const segments = typedPath.split('.');
  const prefix = segments.slice(0, -1).join('.');

  // Get fields for the specific prefix
  const prefixFields = prefix ? getFieldsForResourcePrefix(resource, prefix, version) : allFields;

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
export function extractResource<T extends SupportedApiVersion>(
  query: string,
): ResourceName<T> | undefined {
  const fromMatch = query.match(/\bFROM\s+(\w+)/i);
  return fromMatch ? (fromMatch[1] as ResourceName<T>) : undefined;
}

/**
 * Extract field names from SELECT clause
 * @param query The GAQL query string
 * @returns Array of field names
 */
export function extractSelectFields(query: string): string[] {
  const selectClause = extractSelectClause(query);
  if (!selectClause) return [];

  return selectClause
    .split(',')
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
}

/**
 * Extract the body of a SELECT clause from a GAQL query.
 * Returns the text between SELECT and FROM keywords.
 * Uses string searching instead of regex to avoid polynomial backtracking (ReDoS).
 */
export function extractSelectClause(query: string): string | null {
  const upper = query.toUpperCase();

  const selectIdx = findKeywordIndex(upper, 'SELECT', 0);
  if (selectIdx === -1) return null;

  // Skip SELECT and leading whitespace
  let start = selectIdx + 6;
  while (start < query.length && isWhitespaceChar(query.charCodeAt(start))) start++;
  if (start >= query.length) return null;

  // Find FROM after start
  const fromIdx = findKeywordIndex(upper, 'FROM', start);
  if (fromIdx === -1) return null;

  const result = query.substring(start, fromIdx).trim();
  return result.length > 0 ? result : null;
}

/**
 * Extract field names from WHERE clause
 * @param query The GAQL query string
 * @returns Array of field names
 */
export function extractWhereFields(query: string): string[] {
  const whereClause = extractWhereClause(query);
  if (!whereClause) return [];

  return extractDottedIdentifiers(whereClause);
}

/**
 * Extract the body of a WHERE clause from a GAQL query.
 * Returns the text between WHERE and the next ORDER BY, LIMIT, or end of string.
 * Uses string searching instead of regex to avoid polynomial backtracking (ReDoS).
 */
export function extractWhereClause(query: string): string | null {
  const upper = query.toUpperCase();

  // Find WHERE keyword
  const whereIdx = findKeywordIndex(upper, 'WHERE', 0);
  if (whereIdx === -1) return null;

  // Skip WHERE and leading whitespace
  let start = whereIdx + 5;
  while (start < query.length && isWhitespaceChar(query.charCodeAt(start))) start++;
  if (start >= query.length) return null;

  // Find end boundary: ORDER BY or LIMIT (whichever comes first after start)
  let end = query.length;

  const orderIdx = findKeywordIndex(upper, 'ORDER', start);
  if (orderIdx !== -1 && orderIdx < end) {
    // Verify it's followed by optional whitespace then BY
    let afterOrder = orderIdx + 5;
    while (afterOrder < upper.length && isWhitespaceChar(upper.charCodeAt(afterOrder)))
      afterOrder++;
    if (
      upper.startsWith('BY', afterOrder) &&
      (afterOrder + 2 >= upper.length || !isIdentCharCode(upper.charCodeAt(afterOrder + 2)))
    ) {
      end = orderIdx;
    }
  }

  const limitIdx = findKeywordIndex(upper, 'LIMIT', start);
  if (limitIdx !== -1 && limitIdx < end) {
    end = limitIdx;
  }

  const result = query.substring(start, end).trim();
  return result.length > 0 ? result : null;
}

/**
 * Find a keyword in text at a word boundary (not preceded/followed by identifier chars).
 */
function findKeywordIndex(text: string, keyword: string, from: number): number {
  const len = keyword.length;
  let pos = from;
  while (pos <= text.length - len) {
    const idx = text.indexOf(keyword, pos);
    if (idx === -1) return -1;
    const before = idx > 0 ? text.charCodeAt(idx - 1) : 32;
    const after = idx + len < text.length ? text.charCodeAt(idx + len) : 32;
    if (!isIdentCharCode(before) && !isIdentCharCode(after)) {
      return idx;
    }
    pos = idx + 1;
  }
  return -1;
}

function isWhitespaceChar(c: number): boolean {
  return c === 32 || c === 9 || c === 10 || c === 13; // space, tab, LF, CR
}

/**
 * Extract dotted identifiers (e.g., "campaign.id", "metrics.clicks") from text.
 * Uses manual scanning instead of regex to avoid polynomial backtracking (ReDoS).
 */
export function extractDottedIdentifiers(text: string): string[] {
  const results: string[] = [];
  const len = text.length;
  let i = 0;

  while (i < len) {
    const c = text.charCodeAt(i);
    // Check for identifier start: [a-zA-Z_]
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95) {
      const start = i;
      i++;
      // Consume identifier chars: [a-zA-Z0-9_]
      while (i < len && isIdentCharCode(text.charCodeAt(i))) i++;
      // Check for dot followed by another identifier
      if (i < len && text.charCodeAt(i) === 46) {
        const dotPos = i;
        i++;
        const c2 = i < len ? text.charCodeAt(i) : 0;
        if ((c2 >= 65 && c2 <= 90) || (c2 >= 97 && c2 <= 122) || c2 === 95) {
          i++;
          while (i < len && isIdentCharCode(text.charCodeAt(i))) i++;
          results.push(text.substring(start, i));
        } else {
          // Dot not followed by valid identifier start, skip
          i = dotPos + 1;
        }
      }
      // If no dot, just continue (i is already past the identifier)
    } else {
      i++;
    }
  }

  return results;
}

function isIdentCharCode(c: number): boolean {
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 95;
}
