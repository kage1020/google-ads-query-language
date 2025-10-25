import { getFieldsForResource, getResourceNames } from './schema.js';

/**
 * Validation error types
 */
export enum ValidationErrorType {
  MISSING_SELECT = 'missing_select',
  MISSING_FROM = 'missing_from',
  INVALID_RESOURCE = 'invalid_resource',
  INVALID_FIELD = 'invalid_field',
  INVALID_SYNTAX = 'invalid_syntax',
  INVALID_OPERATOR = 'invalid_operator',
}

/**
 * Validation error information
 */
export interface ValidationError {
  type: ValidationErrorType;
  message: string;
  line: number;
  column: number;
  length: number;
  field?: string;
  resource?: string;
  suggestion?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Remove template literal interpolations from query for validation
 * This prevents ${...} expressions from being validated as fields
 * @param query The query string potentially containing ${...}
 * @returns Query with ${...} replaced by placeholder strings
 */
function stripTemplateLiteralInterpolations(query: string): string {
  // Replace ${...} with a placeholder to avoid validating interpolated expressions
  // We use a string literal placeholder to maintain query structure
  return query.replace(/\$\{(?:[^{}]|\{[^}]*\})*\}/g, "'__PLACEHOLDER__'");
}

/**
 * Validate a single GAQL query string
 * @param query The GAQL query string to validate
 * @returns Validation result with errors if any
 */
export function validateQuery(query: string): ValidationResult {
  // Strip template literal interpolations before validation
  const cleanedQuery = stripTemplateLiteralInterpolations(query);

  const errors: ValidationError[] = [];
  const lines = query.split('\n');

  // Check for SELECT keyword
  if (!cleanedQuery.match(/\bSELECT\b/i)) {
    errors.push({
      type: ValidationErrorType.MISSING_SELECT,
      message: 'Missing SELECT clause',
      line: 0,
      column: 0,
      length: cleanedQuery.length,
    });
  }

  // Check for FROM keyword
  if (!cleanedQuery.match(/\bFROM\b/i)) {
    errors.push({
      type: ValidationErrorType.MISSING_FROM,
      message: 'Missing FROM clause',
      line: 0,
      column: 0,
      length: cleanedQuery.length,
    });
    // Cannot continue validation without FROM clause
    return { valid: errors.length === 0, errors };
  }

  // Extract resource name from FROM clause
  const fromMatch = cleanedQuery.match(/\bFROM\s+(\w+)/i);
  if (!fromMatch) {
    errors.push({
      type: ValidationErrorType.INVALID_SYNTAX,
      message: 'Invalid FROM clause syntax',
      line: 0,
      column: 0,
      length: cleanedQuery.length,
    });
    return { valid: false, errors };
  }

  const resourceName = fromMatch[1];
  const availableResources = getResourceNames();

  // Validate resource name
  if (!availableResources.includes(resourceName)) {
    const lineIndex = lines.findIndex((line) => line.match(/\bFROM\b/i));
    const line = lines[lineIndex] || '';
    const column = line.toLowerCase().indexOf('from') + 5; // 5 = 'FROM '.length

    errors.push({
      type: ValidationErrorType.INVALID_RESOURCE,
      message: `Invalid resource name: ${resourceName}`,
      line: lineIndex,
      column,
      length: resourceName.length,
      field: resourceName,
      suggestion: findClosestMatch(resourceName, availableResources),
    });
    // Cannot continue field validation without valid resource
    return { valid: false, errors };
  }

  // Validate fields in SELECT clause
  const selectMatch = cleanedQuery.match(/\bSELECT\s+(.+?)\s+FROM/is);
  if (selectMatch) {
    const selectFields = selectMatch[1]
      .split(',')
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const validFields = getFieldsForResource(resourceName);
    const validFieldDescriptions = validFields.map((f) => f.description);

    for (const field of selectFields) {
      if (!validFieldDescriptions.includes(field)) {
        // Find line and column for this field
        const lineIndex = findFieldLine(lines, field, 'SELECT');
        const line = lines[lineIndex] || '';
        const column = line.indexOf(field);

        errors.push({
          type: ValidationErrorType.INVALID_FIELD,
          message: `Invalid field: ${field} for resource ${resourceName}`,
          line: lineIndex,
          column: column >= 0 ? column : 0,
          length: field.length,
          field,
          resource: resourceName,
          suggestion: findClosestMatch(field, validFieldDescriptions),
        });
      }
    }
  }

  // Validate fields in WHERE clause
  const whereMatch = cleanedQuery.match(/\bWHERE\s+(.+?)(\s+ORDER\s+BY|\s+LIMIT|$)/is);
  if (whereMatch) {
    const whereClause = whereMatch[1];
    // Extract field references (e.g., campaign.id, metrics.clicks)
    const fieldRegex = /([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)/gi;
    const whereFields = whereClause.match(fieldRegex) || [];

    const validFields = getFieldsForResource(resourceName);
    const validFieldDescriptions = validFields.map((f) => f.description);

    for (const field of whereFields) {
      if (!validFieldDescriptions.includes(field)) {
        const lineIndex = findFieldLine(lines, field, 'WHERE');
        const line = lines[lineIndex] || '';
        const column = line.indexOf(field);

        errors.push({
          type: ValidationErrorType.INVALID_FIELD,
          message: `Invalid field: ${field} for resource ${resourceName}`,
          line: lineIndex,
          column: column >= 0 ? column : 0,
          length: field.length,
          field,
          resource: resourceName,
          suggestion: findClosestMatch(field, validFieldDescriptions),
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Find the line number where a field appears after a keyword
 */
function findFieldLine(lines: string[], field: string, afterKeyword: string): number {
  let foundKeyword = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!foundKeyword && line.match(new RegExp(`\\b${afterKeyword}\\b`, 'i'))) {
      foundKeyword = true;
    }
    if (foundKeyword && line.includes(field)) {
      return i;
    }
  }
  return 0;
}

/**
 * Find the closest match for a field name using Levenshtein distance
 */
function findClosestMatch(input: string, candidates: string[]): string | undefined {
  if (candidates.length === 0) return undefined;

  let minDistance = Number.POSITIVE_INFINITY;
  let closestMatch: string | undefined;

  for (const candidate of candidates) {
    const distance = levenshteinDistance(input.toLowerCase(), candidate.toLowerCase());
    if (distance < minDistance) {
      minDistance = distance;
      closestMatch = candidate;
    }
  }

  // Only suggest if distance is reasonable (less than half the input length)
  return minDistance <= input.length / 2 ? closestMatch : undefined;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Validate multiple queries in a text (e.g., from a file)
 * This function extracts GAQL queries from template literals
 * @param text The text containing GAQL queries
 * @returns Array of validation results with query positions
 */
export function validateText(
  text: string,
): Array<ValidationResult & { query: string; line: number }> {
  const results: Array<ValidationResult & { query: string; line: number }> = [];

  // Extract queries from template literals
  const queryRegex = /`([^`]*SELECT[^`]*FROM[^`]*)`/gi;
  let match: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: needed for regex matching
  while ((match = queryRegex.exec(text)) !== null) {
    const query = match[1].trim();
    const startPos = match.index;
    const lineNumber = text.substring(0, startPos).split('\n').length - 1;

    const result = validateQuery(query);
    results.push({
      ...result,
      query,
      line: lineNumber,
    });
  }

  return results;
}
