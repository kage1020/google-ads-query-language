// Builder exports
export {
  createQueryBuilder,
  DefaultQueryValidator,
  GoogleAdsQueryBuilder,
  type QueryBuilderConfig,
  type QueryExecutor,
  type QueryParser,
  type QueryValidator,
} from './builder.js';
// Parser exports
export {
  type CompletionItem,
  determineContext,
  extractResource,
  extractSelectFields,
  extractWhereFields,
  getCompletions,
  type ParseResult,
  type QueryContext,
} from './parser.js';
export {
  type AnyResourceName,
  defaultApiVersion,
  type FieldDefinition,
  type FieldNameForResource,
  fieldsDataV19,
  fieldsDataV20,
  fieldsDataV21,
  GAQL_KEYWORDS,
  getFieldsForResource,
  getFieldsForResourcePrefix,
  getMetricsForResource,
  getResourceInfo,
  getResourceNames,
  getSegmentsForResource,
  OPERATORS,
  ResourceName,
  ResourceNameV19,
  ResourceNameV20,
  ResourceNameV21,
  STATUS_VALUES,
  SupportedApiVersion,
  SupportedApiVersions,
} from './schema.js';
export {
  type ValidationError,
  ValidationErrorType,
  type ValidationResult,
  validateQuery,
  validateText,
} from './validator.js';
