import fieldsDataV19 from './schemas/fields-v19.json' with { type: 'json' };
import fieldsDataV20 from './schemas/fields-v20.json' with { type: 'json' };
import fieldsDataV21 from './schemas/fields-v21.json' with { type: 'json' };

export interface FieldDefinition {
  name: string;
  type: string;
  description: string;
  documentation?: string;
}

interface FieldsDataType {
  [resourceName: string]: {
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
}

// Version management
let currentApiVersion: '19' | '20' | '21' = '21';

const versionSchemas: Record<string, FieldsDataType> = {
  '19': fieldsDataV19 as FieldsDataType,
  '20': fieldsDataV20 as FieldsDataType,
  '21': fieldsDataV21 as FieldsDataType,
};

/**
 * Set the Google Ads API version to use
 * @param version API version (19, 20, or 21)
 */
export function setApiVersion(version: '19' | '20' | '21'): void {
  currentApiVersion = version;
}

/**
 * Get the current Google Ads API version
 * @returns Current API version
 */
export function getApiVersion(): string {
  return currentApiVersion;
}

/**
 * Get the fields data for the current API version
 * @returns Fields data for the current version
 */
function getFieldsData(): FieldsDataType {
  return versionSchemas[currentApiVersion];
}

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
export function getFieldsForResource(resourceName: string): FieldDefinition[] {
  const fieldsData = getFieldsData();
  const data = fieldsData[resourceName];
  if (!data || !data.fields) {
    return [];
  }

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
export function getFieldsForResourcePrefix(
  fromResource: string,
  resourcePrefix: string,
): FieldDefinition[] {
  const fieldsData = getFieldsData();
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

// Get all available resource prefixes for a FROM resource
export function getResourcePrefixesForResource(resourceName: string): string[] {
  const fieldsData = getFieldsData();
  const data = fieldsData[resourceName];
  if (!data || !data.fields) return [];

  return Object.keys(data.fields).sort();
}

// Get metrics fields for a specific resource
export function getMetricsForResource(resourceName: string): FieldDefinition[] {
  const fieldsData = getFieldsData();
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
export function getSegmentsForResource(resourceName: string): FieldDefinition[] {
  const fieldsData = getFieldsData();
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
export function getResourceNames(): string[] {
  const fieldsData = getFieldsData();
  return Object.keys(fieldsData).sort();
}

// Get resource information
export function getResourceInfo(resourceName: string): {
  name: string;
  fieldCount: number;
  metricCount: number;
  segmentCount: number;
  attributedResources: string[];
} | null {
  const fieldsData = getFieldsData();
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
