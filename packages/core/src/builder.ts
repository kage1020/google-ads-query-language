import type { Customer as CustomerV19 } from 'google-ads-api-v19';
import type { Customer as CustomerV20 } from 'google-ads-api-v20';
import type { Customer as CustomerV21 } from 'google-ads-api-v21';
import {
  type AnyResourceName,
  defaultApiVersion,
  type FieldNameForResource,
  getFieldsForResource,
  getResourceNames,
  type ResourceName,
  type SupportedApiVersion,
} from './schema.js';
import type { ValidationResult } from './validator.js';
import { validateQuery } from './validator.js';

/**
 * Google Ads API Customer class from any supported version
 */
export type GoogleAdsCustomer = CustomerV19 | CustomerV20 | CustomerV21;

/**
 * Interface for query validation
 */
export interface QueryValidator {
  /**
   * Validate a GAQL query
   * @param query GAQL query string
   * @returns Validation result
   */
  validate(query: string): ValidationResult;
}

/**
 * Interface for query execution
 */
export interface QueryExecutor<TResult = unknown> {
  /**
   * Execute a GAQL query
   * @param query GAQL query string
   * @returns Query execution result
   */
  execute(query: string): Promise<TResult>;
}

/**
 * Interface for query parsing
 */
export interface QueryParser<TParsed = unknown> {
  /**
   * Parse a GAQL query
   * @param query GAQL query string
   * @returns Parsed query result
   */
  parse(query: string): TParsed;
}

/**
 * Default validator implementation using built-in validateQuery
 */
export class DefaultQueryValidator implements QueryValidator {
  private apiVersion: SupportedApiVersion;

  constructor(apiVersion: SupportedApiVersion = defaultApiVersion) {
    this.apiVersion = apiVersion;
  }

  validate(query: string): ValidationResult {
    return validateQuery(query, this.apiVersion);
  }

  setApiVersion(version: SupportedApiVersion): void {
    this.apiVersion = version;
  }
}

/**
 * Configuration options for GoogleAdsQueryBuilder
 */
export interface QueryBuilderConfig<TResult = unknown, TParsed = unknown> {
  /**
   * Query validator (defaults to DefaultQueryValidator)
   */
  validator?: QueryValidator;
  /**
   * Query executor for executing queries.
   * Can be either a QueryExecutor interface implementation or a google-ads-api Customer instance.
   */
  executor?: QueryExecutor<TResult> | GoogleAdsCustomer;
  /**
   * Query parser for parsing queries
   */
  parser?: QueryParser<TParsed>;
  /**
   * Automatically validate query when building (default: true)
   */
  autoValidate?: boolean;
  /**
   * Google Ads API version (defaults to defaultApiVersion)
   */
  apiVersion?: SupportedApiVersion;
}

/**
 * Google Ads Query Language (GAQL) Query Builder
 *
 * Provides a fluent, type-safe interface for building GAQL queries with:
 * - Chain methods for constructing queries
 * - Type inference based on the selected resource
 * - Dependency injection for validation, execution, and parsing
 *
 * ## Type-Safe Field Selection
 *
 * When you call `.from(resource)`, TypeScript automatically infers the resource type
 * and enforces that only fields from that resource (or metrics/segments) can be selected:
 *
 * @example Type inference with field validation
 * ```typescript
 * const builder = new GoogleAdsQueryBuilder()
 *   .from('campaign')  // Resource type is inferred as 'campaign'
 *   .select([
 *     'campaign.id',        // ✓ Valid - matches resource
 *     'campaign.name',      // ✓ Valid - matches resource
 *     'metrics.impressions', // ✓ Valid - metrics always allowed
 *     'segments.date',      // ✓ Valid - segments always allowed
 *     // 'ad_group.id'      // ✗ TypeScript error - wrong resource
 *   ])
 *   .build();
 * ```
 *
 * @example Basic usage
 * ```typescript
 * const query = new GoogleAdsQueryBuilder()
 *   .from('campaign')
 *   .select(['campaign.id', 'campaign.name', 'metrics.impressions'])
 *   .where('campaign.status = "ENABLED"')
 *   .orderBy('metrics.impressions', 'DESC')
 *   .limit(10)
 *   .build();
 *
 * // Validate the query
 * const result = builder.validate();
 * if (!result.valid) {
 *   console.error('Query validation failed:', result.errors);
 * }
 * ```
 *
 * @example With dependency injection
 * ```typescript
 * const builder = new GoogleAdsQueryBuilder({
 *   validator: new CustomValidator(),
 *   executor: new GoogleAdsExecutor(client),
 *   apiVersion: '21',
 * });
 *
 * const results = await builder
 *   .from('campaign')
 *   .select(['campaign.id', 'campaign.name'])
 *   .execute();
 * ```
 *
 * @template TResource The resource type (inferred from `from()` method)
 */
export class GoogleAdsQueryBuilder<TResource extends string = never> {
  private _select: string[] = [];
  private _from?: string;
  private _where: string[] = [];
  private _orderBy: Array<{ field: string; direction: 'ASC' | 'DESC' }> = [];
  private _limit?: number;
  private _parameters: string[] = [];

  private validator: QueryValidator;
  private executor?: QueryExecutor<unknown> | GoogleAdsCustomer;
  private parser?: QueryParser<unknown>;
  private autoValidate: boolean;
  private apiVersion: SupportedApiVersion;

  /**
   * Create a new GoogleAdsQueryBuilder instance
   * @param config Configuration options for the builder
   */
  constructor(config: QueryBuilderConfig = {}) {
    this.apiVersion = config.apiVersion || defaultApiVersion;
    this.validator = config.validator || new DefaultQueryValidator(this.apiVersion);
    this.executor = config.executor;
    this.parser = config.parser;
    this.autoValidate = config.autoValidate !== false;
  }

  /**
   * Specify the resource to query from
   *
   * This method enables type inference for subsequent method calls,
   * ensuring that only valid fields for the selected resource can be used.
   *
   * @param resource The resource name (e.g., 'campaign', 'ad_group', 'customer')
   * @returns The builder instance with the resource type
   *
   * @example
   * ```typescript
   * const builder = new GoogleAdsQueryBuilder()
   *   .from('campaign')
   *   .select(['campaign.id', 'campaign.name']);
   * ```
   */
  from<R extends AnyResourceName>(resource: R): GoogleAdsQueryBuilder<R> {
    this._from = resource;
    return this as unknown as GoogleAdsQueryBuilder<R>;
  }

  /**
   * Specify the fields to select in the query
   *
   * Fields should be in the format 'resource.field', 'metrics.metric_name',
   * or 'segments.segment_name'.
   *
   * When a resource is specified via `from()`, only fields matching that resource
   * prefix (or metrics/segments) are type-checked.
   *
   * @param fields Array of field names to select
   * @returns The builder instance for method chaining
   *
   * @example
   * ```typescript
   * // After calling .from('campaign'), TypeScript will enforce field names
   * builder
   *   .from('campaign')
   *   .select([
   *     'campaign.id',        // ✓ Valid
   *     'campaign.name',      // ✓ Valid
   *     'metrics.impressions', // ✓ Valid
   *     'segments.date',      // ✓ Valid
   *     // 'ad_group.id'      // ✗ Type error - wrong resource
   *   ]);
   * ```
   */
  select<F extends FieldNameForResource<TResource>>(fields: readonly F[]): this {
    this._select = [...this._select, ...(fields as readonly string[])];
    return this;
  }

  /**
   * Add a WHERE clause condition to the query
   *
   * Multiple calls to `where()` will be combined with AND logic.
   *
   * @param condition The WHERE condition (e.g., 'campaign.status = "ENABLED"')
   * @returns The builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder
   *   .where('campaign.status = "ENABLED"')
   *   .where('metrics.impressions > 1000');
   * ```
   */
  where(condition: string): this {
    this._where.push(condition);
    return this;
  }

  /**
   * Add an ORDER BY clause to the query
   *
   * @param field The field to order by
   * @param direction The sort direction ('ASC' or 'DESC', defaults to 'ASC')
   * @returns The builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.orderBy('metrics.impressions', 'DESC');
   * ```
   */
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this._orderBy.push({ field, direction });
    return this;
  }

  /**
   * Add a LIMIT clause to the query
   *
   * @param count The maximum number of rows to return
   * @returns The builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.limit(100);
   * ```
   */
  limit(count: number): this {
    this._limit = count;
    return this;
  }

  /**
   * Add a PARAMETERS clause to the query
   *
   * Parameters can be used for configuration options in the query.
   *
   * @param parameters Array of parameter strings
   * @returns The builder instance for method chaining
   *
   * @example
   * ```typescript
   * builder.parameters(['include_drafts=true']);
   * ```
   */
  parameters(parameters: readonly string[]): this {
    this._parameters = [...this._parameters, ...parameters];
    return this;
  }

  /**
   * Build the GAQL query string
   *
   * If `autoValidate` is enabled (default), the query will be automatically
   * validated before being returned. If validation fails, an error will be thrown.
   *
   * @returns The GAQL query string
   * @throws {Error} If autoValidate is enabled and validation fails
   *
   * @example
   * ```typescript
   * const query = builder
   *   .from('campaign')
   *   .select(['campaign.id', 'campaign.name'])
   *   .build();
   * // Result: "SELECT campaign.id, campaign.name FROM campaign"
   * ```
   */
  build(): string {
    const parts: string[] = [];

    // SELECT clause
    if (this._select.length > 0) {
      parts.push(`SELECT ${this._select.join(', ')}`);
    }

    // FROM clause
    if (this._from) {
      parts.push(`FROM ${this._from}`);
    }

    // WHERE clause
    if (this._where.length > 0) {
      parts.push(`WHERE ${this._where.join(' AND ')}`);
    }

    // ORDER BY clause
    if (this._orderBy.length > 0) {
      const orderByStr = this._orderBy.map((o) => `${o.field} ${o.direction}`).join(', ');
      parts.push(`ORDER BY ${orderByStr}`);
    }

    // LIMIT clause
    if (this._limit !== undefined) {
      parts.push(`LIMIT ${this._limit}`);
    }

    // PARAMETERS clause
    if (this._parameters.length > 0) {
      parts.push(`PARAMETERS ${this._parameters.join(',')}`);
    }

    const query = parts.join(' ');

    // Auto-validate if enabled
    if (this.autoValidate) {
      const validationResult = this.validator.validate(query);
      if (!validationResult.valid) {
        const errorMessages = validationResult.errors.map((e) => e.message).join('; ');
        throw new Error(`Query validation failed: ${errorMessages}`);
      }
    }

    return query;
  }

  /**
   * Validate the current query
   *
   * Uses the injected validator (or default validator) to validate the query.
   *
   * @returns The validation result
   *
   * @example
   * ```typescript
   * const result = builder.validate();
   * if (!result.valid) {
   *   result.errors.forEach(error => {
   *     console.error(`Error at line ${error.line}: ${error.message}`);
   *   });
   * }
   * ```
   */
  validate(): ValidationResult {
    const query = this._buildWithoutValidation();
    return this.validator.validate(query);
  }

  /**
   * Execute the query using the injected executor
   *
   * @returns The query execution result
   * @throws {Error} If no executor is configured
   *
   * @example
   * ```typescript
   * // Using google-ads-api Customer instance
   * import { GoogleAdsApi } from 'google-ads-api';
   * const client = new GoogleAdsApi({ ... });
   * const customer = client.Customer({ customer_id: '1234567890' });
   *
   * const builder = new GoogleAdsQueryBuilder({
   *   executor: customer
   * });
   *
   * const results = await builder
   *   .from('campaign')
   *   .select(['campaign.id', 'campaign.name'])
   *   .execute();
   * ```
   */
  async execute<TResult = unknown>(): Promise<TResult> {
    if (!this.executor) {
      throw new Error('No executor configured. Provide an executor in the constructor.');
    }

    const query = this.build();

    // Check if executor is a google-ads-api Customer instance (has query method)
    if ('query' in this.executor && typeof this.executor.query === 'function') {
      return this.executor.query(query) as Promise<TResult>;
    }

    // Otherwise, treat it as QueryExecutor interface (has execute method)
    if ('execute' in this.executor && typeof this.executor.execute === 'function') {
      return this.executor.execute(query) as Promise<TResult>;
    }

    throw new Error('Invalid executor: must have either query() or execute() method.');
  }

  /**
   * Parse the query using the injected parser
   *
   * @returns The parsed query result
   * @throws {Error} If no parser is configured
   *
   * @example
   * ```typescript
   * const builder = new GoogleAdsQueryBuilder({
   *   parser: new CustomParser()
   * });
   *
   * const parsed = builder
   *   .from('campaign')
   *   .select(['campaign.id'])
   *   .parse();
   * ```
   */
  parse<TParsed = unknown>(): TParsed {
    if (!this.parser) {
      throw new Error('No parser configured. Provide a parser in the constructor.');
    }

    const query = this.build();
    return this.parser.parse(query) as TParsed;
  }

  /**
   * Get available fields for the current resource
   *
   * Returns all fields, metrics, and segments available for the resource
   * specified in the `from()` method.
   *
   * @returns Array of available field names, or empty array if no resource is set
   *
   * @example
   * ```typescript
   * const fields = builder.from('campaign').getAvailableFields();
   * // Returns: ['campaign.id', 'campaign.name', 'metrics.impressions', ...]
   * ```
   */
  getAvailableFields(): string[] {
    if (!this._from) {
      return [];
    }

    const fields = getFieldsForResource(
      this._from as ResourceName<SupportedApiVersion>,
      this.apiVersion,
    );
    return fields.map((f) => f.description);
  }

  /**
   * Get all available resource names for the configured API version
   *
   * @returns Array of all available resource names
   *
   * @example
   * ```typescript
   * const resources = builder.getAvailableResources();
   * // Returns: ['campaign', 'ad_group', 'ad_group_ad', ...]
   * ```
   */
  getAvailableResources(): string[] {
    return getResourceNames(this.apiVersion);
  }

  /**
   * Get all available resource names for a specific API version
   *
   * @param apiVersion The API version to get resources for
   * @returns Array of all available resource names
   *
   * @example
   * ```typescript
   * const resources = GoogleAdsQueryBuilder.getAvailableResourcesForVersion('21');
   * // Returns: ['campaign', 'ad_group', 'ad_group_ad', ...]
   * ```
   */
  static getAvailableResourcesForVersion(
    apiVersion: SupportedApiVersion = defaultApiVersion,
  ): string[] {
    return getResourceNames(apiVersion);
  }

  /**
   * Get the current API version
   *
   * @returns The API version being used
   */
  getApiVersion(): SupportedApiVersion {
    return this.apiVersion;
  }

  /**
   * Set the API version to use
   *
   * @param version The API version to use
   * @returns The builder instance for method chaining
   */
  setApiVersion(version: SupportedApiVersion): this {
    this.apiVersion = version;
    // Update validator API version if it's a DefaultQueryValidator
    if (this.validator instanceof DefaultQueryValidator) {
      this.validator.setApiVersion(version);
    }
    return this;
  }

  /**
   * Reset the builder to its initial state
   *
   * @returns The builder instance for method chaining
   */
  reset(): this {
    this._select = [];
    this._from = undefined;
    this._where = [];
    this._orderBy = [];
    this._limit = undefined;
    this._parameters = [];
    return this;
  }

  /**
   * Create a copy of the current builder
   *
   * @returns A new builder instance with the same configuration
   */
  clone(): GoogleAdsQueryBuilder<TResource> {
    return this._clone<TResource>();
  }

  /**
   * Build the query without automatic validation
   * @private
   */
  private _buildWithoutValidation(): string {
    const parts: string[] = [];

    if (this._select.length > 0) {
      parts.push(`SELECT ${this._select.join(', ')}`);
    }

    if (this._from) {
      parts.push(`FROM ${this._from}`);
    }

    if (this._where.length > 0) {
      parts.push(`WHERE ${this._where.join(' AND ')}`);
    }

    if (this._orderBy.length > 0) {
      const orderByStr = this._orderBy.map((o) => `${o.field} ${o.direction}`).join(', ');
      parts.push(`ORDER BY ${orderByStr}`);
    }

    if (this._limit !== undefined) {
      parts.push(`LIMIT ${this._limit}`);
    }

    if (this._parameters.length > 0) {
      parts.push(`PARAMETERS ${this._parameters.join(',')}`);
    }

    return parts.join(' ');
  }

  /**
   * Clone the builder with a new resource type
   * @private
   */
  private _clone<R extends string>(): GoogleAdsQueryBuilder<R> {
    const newBuilder = new GoogleAdsQueryBuilder<R>({
      validator: this.validator,
      executor: this.executor,
      parser: this.parser,
      autoValidate: this.autoValidate,
      apiVersion: this.apiVersion,
    });

    newBuilder._select = [...this._select];
    newBuilder._from = this._from;
    newBuilder._where = [...this._where];
    newBuilder._orderBy = [...this._orderBy];
    newBuilder._limit = this._limit;
    newBuilder._parameters = [...this._parameters];

    return newBuilder;
  }
}

/**
 * Create a new GoogleAdsQueryBuilder instance
 *
 * Convenience function for creating a builder without using `new`.
 *
 * @param config Configuration options for the builder
 * @returns A new GoogleAdsQueryBuilder instance
 *
 * @example
 * ```typescript
 * const query = createQueryBuilder()
 *   .from('campaign')
 *   .select(['campaign.id', 'campaign.name'])
 *   .build();
 * ```
 */
export function createQueryBuilder<TResult = unknown, TParsed = unknown>(
  config?: QueryBuilderConfig<TResult, TParsed>,
): GoogleAdsQueryBuilder<never> {
  return new GoogleAdsQueryBuilder(config);
}
