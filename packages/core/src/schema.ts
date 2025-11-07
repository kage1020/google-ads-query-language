import type { fields as fieldsV19 } from 'google-ads-api-v19';
import type { fields as fieldsV20 } from 'google-ads-api-v20';
import type { fields as fieldsV21 } from 'google-ads-api-v21';
// Import auto-generated type mappings for all 173 resources
import type {
  ResourceFieldMap,
  ResourceMetricMap,
  ResourceSegmentMap,
} from './generated-resource-types.js';
import fieldsDataV19 from './schemas/fields-v19.json' with { type: 'json' };
import fieldsDataV20 from './schemas/fields-v20.json' with { type: 'json' };
import fieldsDataV21 from './schemas/fields-v21.json' with { type: 'json' };

export const SupportedApiVersions = ['19', '20', '21'] as const;
export type SupportedApiVersion = (typeof SupportedApiVersions)[number];

export type ResourceNameV19 = fieldsV19.Resource;
export type ResourceNameV20 = fieldsV20.Resource;
export type ResourceNameV21 = fieldsV21.Resource;

export type ResourceName<T extends SupportedApiVersion> = T extends '19'
  ? ResourceNameV19
  : T extends '20'
    ? ResourceNameV20
    : ResourceNameV21;

/**
 * Union type of all resource names across all supported API versions
 */
export type AnyResourceName = ResourceNameV19 | ResourceNameV20 | ResourceNameV21;

export interface FieldDefinition {
  name: string;
  type: string;
  description: string;
  documentation?: string;
}

type FieldsDataType<T extends SupportedApiVersion> = {
  [resourceName in ResourceName<T>]: {
    fields: {
      [attributeResource: string]: {
        [fieldName: string]: string;
      };
    };
    metrics: {
      [fieldName: string]: string;
    };
    segments: {
      [fieldName: string]: string;
    };
  };
};

export const defaultApiVersion: SupportedApiVersion = '21';

const versionSchemas: Record<SupportedApiVersion, FieldsDataType<SupportedApiVersion>> = {
  '19': fieldsDataV19 as FieldsDataType<'19'>,
  '20': fieldsDataV20 as FieldsDataType<'20'>,
  '21': fieldsDataV21 as FieldsDataType<'21'>,
};

/**
 * Type helper for field names based on resource
 * Provides strict type checking for actual field names from google-ads-api
 * Uses resource-specific Field, Metric, and Segment types for precise autocomplete
 */
export type FieldNameForResource<TResource extends string> = TResource extends never
  ? string
  : ResourceFieldMap<TResource> extends never
    ? `${TResource}.${string}` | ResourceMetricMap<TResource> | ResourceSegmentMap<TResource>
    : ResourceFieldMap<TResource> | ResourceMetricMap<TResource> | ResourceSegmentMap<TResource>;

// GAQL Keywords
export const GAQL_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'ORDER BY',
  'LIMIT',
  'AND',
  'OR',
  'NOT',
  'IN',
  'BETWEEN',
  'LIKE',
  'IS NULL',
  'IS NOT NULL',
  'ASC',
  'DESC',
  'DURING',
  'YESTERDAY',
  'TODAY',
  'LAST_7_DAYS',
  'LAST_14_DAYS',
  'LAST_30_DAYS',
  'THIS_MONTH',
  'LAST_MONTH',
  'THIS_WEEK_SUN_TODAY',
  'THIS_WEEK_MON_TODAY',
  'LAST_WEEK_SUN_SAT',
  'LAST_WEEK_MON_SUN',
];

// Status values from google-ads-api enums
export const STATUS_VALUES = ['ENABLED', 'PAUSED', 'REMOVED', 'UNKNOWN', 'UNSPECIFIED'];

// Common operators
export const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'IN', 'NOT IN', 'LIKE', 'NOT LIKE'];

// Get fields for a specific resource (including attributed resources)
export function getFieldsForResource<T extends SupportedApiVersion>(
  resourceName: ResourceName<T>,
  version: T,
): FieldDefinition[] {
  const fieldsData = versionSchemas[version];
  const data = fieldsData[resourceName];
  if (!data) return [];

  // Collect all fields from all attributed resources
  const allFields: FieldDefinition[] = [];
  for (const [resourcePrefix, fields] of Object.entries(data.fields)) {
    for (const [fieldName, documentation] of Object.entries(fields)) {
      allFields.push({
        name: fieldName,
        type: 'string',
        description: `${resourcePrefix}.${fieldName}`,
        documentation,
      });
    }
  }

  // Add metrics
  for (const [metricName, documentation] of Object.entries(data.metrics)) {
    allFields.push({
      name: metricName,
      type: 'metric',
      description: `metrics.${metricName}`,
      documentation,
    });
  }

  // Add segments
  for (const [segmentName, documentation] of Object.entries(data.segments)) {
    allFields.push({
      name: segmentName,
      type: 'segment',
      description: `segments.${segmentName}`,
      documentation,
    });
  }

  return allFields.sort((a, b) => a.name.localeCompare(b.name));
}

// Get fields for a specific resource prefix (e.g., "customer" when FROM campaign)
export function getFieldsForResourcePrefix<T extends SupportedApiVersion>(
  fromResource: ResourceName<T>,
  resourcePrefix: string,
  version: T,
): FieldDefinition[] {
  const fieldsData = versionSchemas[version];
  const data = fieldsData[fromResource];
  if (!data || !data.fields) return [];

  const fields = data.fields[resourcePrefix];
  if (!fields) return [];

  return Object.entries(fields).map(([fieldName, documentation]) => ({
    name: fieldName,
    type: 'string',
    description: `${resourcePrefix}.${fieldName}`,
    documentation,
  }));
}

// Get metrics fields for a specific resource
export function getMetricsForResource<T extends SupportedApiVersion>(
  resourceName: ResourceName<T>,
  version: T,
): FieldDefinition[] {
  const fieldsData = versionSchemas[version];
  const data = fieldsData[resourceName];
  if (!data || !data.metrics) return [];

  return Object.entries(data.metrics).map(([metricName, documentation]) => ({
    name: metricName,
    type: 'metric',
    description: `metrics.${metricName}`,
    documentation,
  }));
}

// Get segments fields for a specific resource
export function getSegmentsForResource<T extends SupportedApiVersion>(
  resourceName: ResourceName<T>,
  version: T,
): FieldDefinition[] {
  const fieldsData = versionSchemas[version];
  const data = fieldsData[resourceName];
  if (!data || !data.segments) return [];

  return Object.entries(data.segments).map(([segmentName, documentation]) => ({
    name: segmentName,
    type: 'segment',
    description: `segments.${segmentName}`,
    documentation,
  }));
}

// Get all available resource names
export function getResourceNames<T extends SupportedApiVersion>(version: T): ResourceName<T>[] {
  const fieldsData = versionSchemas[version];
  return Object.keys(fieldsData).sort() as ResourceName<T>[];
}

// Get resource information
export function getResourceInfo<T extends SupportedApiVersion>(
  resourceName: ResourceName<T>,
  version: T,
): {
  name: string;
  fieldCount: number;
  metricCount: number;
  segmentCount: number;
  attributedResources: string[];
} | null {
  const fieldsData = versionSchemas[version];
  const data = fieldsData[resourceName];
  if (!data) return null;

  const attributedResources = data.fields ? Object.keys(data.fields).sort() : [];
  const fieldCount = Object.values(data.fields || {}).reduce(
    (sum, fields) => sum + Object.keys(fields).length,
    0,
  );
  const metricCount = Object.keys(data.metrics || {}).length;
  const segmentCount = Object.keys(data.segments || {}).length;

  return {
    name: resourceName,
    fieldCount,
    metricCount,
    segmentCount,
    attributedResources,
  };
}

export { fieldsDataV19, fieldsDataV20, fieldsDataV21 };
