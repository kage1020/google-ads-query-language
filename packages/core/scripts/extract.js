/**
 * Extract field definitions with documentation for all supported Google Ads API versions
 *
 * This script extracts schemas for all supported API versions.
 * It reads from the aliased packages and extracts field documentation from protos.d.ts files.
 *
 * Usage: node scripts/extract.js
 */

import fs from 'node:fs';
import path from 'node:path';

// Define all supported API versions
const SUPPORTED_VERSIONS = ['19', '20', '21'];

// Store all resources across versions for type generation
const allResourcesByVersion = {};

for (const version of SUPPORTED_VERSIONS) {
  try {
    // Read the fields.d.ts file from the aliased package
    const fieldsPath = path.join(
      import.meta.dirname,
      '..',
      'node_modules',
      `google-ads-api-v${version}`,
      'build',
      'src',
      'protos',
      'autogen',
      'fields.d.ts',
    );

    // Check if the file exists
    if (!fs.existsSync(fieldsPath)) {
      throw new Error(`Could not find fields.d.ts at: ${fieldsPath}`);
    }

    const content = fs.readFileSync(fieldsPath, 'utf8');

    // Extract resource names from type Resource
    const resourceMatch = content.match(/type Resource = ([^;]+);/);
    if (!resourceMatch) {
      throw new Error('Could not find Resource type');
    }

    const resourcesString = resourceMatch[1];
    const resources = resourcesString.match(/"([^"]+)"/g).map((r) => r.slice(1, -1));

    // Try to load protos.d.ts for documentation
    // Get google-ads-node version from google-ads-api package.json
    const apiPackageJsonPath = path.join(
      import.meta.dirname,
      '..',
      'node_modules',
      `google-ads-api-v${version}`,
      'package.json',
    );
    let googleAdsNodeVersion = null;
    if (fs.existsSync(apiPackageJsonPath)) {
      const apiPackageJson = JSON.parse(fs.readFileSync(apiPackageJsonPath, 'utf8'));
      googleAdsNodeVersion = apiPackageJson.dependencies?.['google-ads-node'];
    }

    // Try multiple possible paths for protos.d.ts
    const possiblePaths = [
      // pnpm path (with version)
      googleAdsNodeVersion &&
        path.join(
          import.meta.dirname,
          '..',
          '..',
          '..',
          'node_modules',
          '.pnpm',
          `google-ads-node@${googleAdsNodeVersion}`,
          'node_modules',
          'google-ads-node',
          'build',
          'protos',
          'protos.d.ts',
        ),
      // Nested path (npm/yarn)
      path.join(
        import.meta.dirname,
        '..',
        'node_modules',
        `google-ads-api-v${version}`,
        'node_modules',
        'google-ads-node',
        'build',
        'protos',
        'protos.d.ts',
      ),
      // Root-level path
      path.join(
        import.meta.dirname,
        '..',
        'node_modules',
        'google-ads-node',
        'build',
        'protos',
        'protos.d.ts',
      ),
    ].filter(Boolean);

    let protosPath = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        protosPath = possiblePath;
        break;
      }
    }

    let protosContent = null;
    let allFieldDocs = null;
    let hasProtos = false;
    if (protosPath) {
      protosContent = fs.readFileSync(protosPath, 'utf8');
      allFieldDocs = extractAllFieldDocs(protosContent);
      hasProtos = true;
    } else {
      console.log('  ⚠ No protos.d.ts found, will use field names as documentation');
    }

    // For each resource, extract Field, Metric, and Segment types
    const resourceFieldsMap = {};

    resources.forEach((resource) => {
      // Convert resource name to CamelCase for type names
      const typeName = resource
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');

      // Try to find Field type for this resource (includes attributed resources)
      const fieldPattern = new RegExp(`type ${typeName}Field = ([^;]+);`);
      const fieldMatch = content.match(fieldPattern);

      // Try to find Metric type for this resource
      const metricPattern = new RegExp(`type ${typeName}Metric = ([^;]+);`);
      const metricMatch = content.match(metricPattern);

      // Try to find Segment type for this resource
      const segmentPattern = new RegExp(`type ${typeName}Segment = ([^;]+);`);
      const segmentMatch = content.match(segmentPattern);

      if (fieldMatch || metricMatch || segmentMatch) {
        // Extract documentation if protos.d.ts is available
        let resourceDocs = null;
        let metricsDocs = null;
        let segmentsDocs = null;

        if (hasProtos && protosContent) {
          resourceDocs = extractInterfaceDocs(protosContent, typeName);
          metricsDocs = extractInterfaceDocs(protosContent, 'Metrics');
          segmentsDocs = extractInterfaceDocs(protosContent, 'Segments');
        }

        resourceFieldsMap[resource] = {
          fields: fieldMatch ? extractFieldsGrouped(fieldMatch[1], resourceDocs, allFieldDocs) : {},
          metrics: metricMatch ? extractFieldsFlat(metricMatch[1], 'metrics.', metricsDocs) : {},
          segments: segmentMatch
            ? extractFieldsFlat(segmentMatch[1], 'segments.', segmentsDocs)
            : {},
        };
      }
    });

    // Ensure schemas directory exists
    const schemasDir = path.join(import.meta.dirname, '..', 'src', 'schemas');
    if (!fs.existsSync(schemasDir)) {
      fs.mkdirSync(schemasDir, { recursive: true });
    }

    // Write to version-specific file
    const outputPath = path.join(schemasDir, `fields-v${version}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(resourceFieldsMap, null, 2));

    // Store resources for type generation
    allResourcesByVersion[version] = resources;
  } catch (error) {
    console.error(`  ❌ Error processing v${version}:`, error.message);
    console.error('');
  }
}

// Generate TypeScript type definitions for all resources
generateResourceTypes(allResourcesByVersion);

/**
 * Extract documentation for fields from an interface in protos.d.ts
 * @param {string} protosContent - Content of protos.d.ts
 * @param {string} interfaceName - Name of the interface (e.g., "Campaign", "Metrics")
 * @returns {Object} Map of field names to their documentation
 */
function extractInterfaceDocs(protosContent, interfaceName) {
  const docs = {};

  // Find the interface definition
  const interfacePattern = new RegExp(
    `interface\\s+I${interfaceName}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`,
    'i',
  );
  const interfaceMatch = protosContent.match(interfacePattern);

  if (!interfaceMatch) {
    return docs;
  }

  const interfaceBody = interfaceMatch[1];

  // Extract field documentation comments
  // Pattern: /** SomeType field_name */
  //          field_name?: ...
  const fieldPattern = /\/\*\*\s*([^*]+?)\s*\*\/\s*\n\s*(\w+)\?:/g;
  for (const match of interfaceBody.matchAll(fieldPattern)) {
    const description = match[1].trim();
    const fieldName = match[2];
    docs[fieldName] = description;
  }

  return docs;
}

/**
 * Extract all field documentation from all interfaces in protos.d.ts
 * Creates a cache of field names to their documentation
 * @param {string} protosContent - Content of protos.d.ts
 * @returns {Object} Map of field names to their documentation
 */
function extractAllFieldDocs(protosContent) {
  const allFieldDocs = {};

  // Pattern to find all field documentation in all interfaces
  // /** Documentation */
  // fieldName?: ...
  const fieldPattern = /\/\*\*\s*([^*]+?)\s*\*\/\s*\n\s*(\w+)\?:/g;
  for (const match of protosContent.matchAll(fieldPattern)) {
    const documentation = match[1].trim();
    const fieldName = match[2];

    // Store documentation (will be overwritten if field exists in multiple interfaces)
    // This is okay as field names are usually unique enough
    if (!allFieldDocs[fieldName] || allFieldDocs[fieldName].length < documentation.length) {
      allFieldDocs[fieldName] = documentation;
    }
  }

  return allFieldDocs;
}

/**
 * Extract fields and group by resource prefix (e.g., "campaign.id" -> { campaign: {id: "doc"} })
 * Excludes metrics and segments as they are handled separately
 */
function extractFieldsGrouped(typeString, resourceDocs, allFieldDocs) {
  const fields = typeString.match(/"([^"]+)"/g) || [];
  const grouped = {};

  fields.forEach((field) => {
    const fieldName = field.slice(1, -1); // Remove quotes

    // Skip metrics and segments (handled separately)
    if (fieldName.startsWith('metrics.') || fieldName.startsWith('segments.')) {
      return;
    }

    // Extract resource prefix and field name
    const dotIndex = fieldName.indexOf('.');
    if (dotIndex === -1) return;

    const resourcePrefix = fieldName.substring(0, dotIndex);
    const fieldNameOnly = fieldName.substring(dotIndex + 1);

    if (!grouped[resourcePrefix]) {
      grouped[resourcePrefix] = {};
    }

    // Get documentation if available
    let documentation = `${resourcePrefix}.${fieldNameOnly}`;

    // For nested fields (e.g., network_settings.target_google_search)
    // Extract the final field name and search for its documentation
    if (fieldNameOnly.includes('.')) {
      const segments = fieldNameOnly.split('.');
      const lastSegment = segments[segments.length - 1];

      // Try to find documentation for the nested field from the cache
      if (allFieldDocs?.[lastSegment]) {
        documentation = allFieldDocs[lastSegment];
      }
    } else {
      // For non-nested fields, use the resource docs
      if (resourceDocs?.[fieldNameOnly]) {
        documentation = resourceDocs[fieldNameOnly];
      }
    }

    grouped[resourcePrefix][fieldNameOnly] = documentation;
  });

  return grouped;
}

/**
 * Extract fields with a specific prefix and return as object with documentation
 */
function extractFieldsFlat(typeString, prefix, docs) {
  const fields = typeString.match(/"([^"]+)"/g) || [];
  const result = {};

  fields
    .map((f) => f.slice(1, -1)) // Remove quotes
    .filter((f) => f.startsWith(prefix))
    .forEach((f) => {
      const fieldName = f.substring(prefix.length); // Remove prefix

      // Get documentation if available
      let documentation = f;
      if (docs?.[fieldName]) {
        documentation = docs[fieldName];
      }

      result[fieldName] = documentation;
    });

  return result;
}

/**
 * Convert snake_case to PascalCase
 * Example: "ad_group" → "AdGroup", "campaign" → "Campaign"
 */
function toPascalCase(str) {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Check if a type exists in fields.d.ts content
 */
function typeExists(fieldsContent, typeName) {
  const pattern = new RegExp(`type ${typeName} =`);
  return pattern.test(fieldsContent);
}

/**
 * Generate TypeScript type definitions for all resources
 */
function generateResourceTypes(resourcesByVersion) {
  console.log('\n📝 Generating TypeScript type definitions...');

  // Load field definitions for each version to check type existence
  const fieldsContents = {};
  for (const version of SUPPORTED_VERSIONS) {
    const fieldsPath = path.join(
      import.meta.dirname,
      '..',
      'node_modules',
      `google-ads-api-v${version}`,
      'build',
      'src',
      'protos',
      'autogen',
      'fields.d.ts',
    );
    if (fs.existsSync(fieldsPath)) {
      fieldsContents[version] = fs.readFileSync(fieldsPath, 'utf8');
    }
  }

  // Get unique resources across all versions
  const allResources = new Set();
  for (const resources of Object.values(resourcesByVersion)) {
    for (const r of resources) {
      allResources.add(r);
    }
  }

  const sortedResources = Array.from(allResources).sort();

  console.log(`   Found ${sortedResources.length} unique resources across all API versions`);

  // Generate Field interface properties
  const fieldInterfaceProps = sortedResources
    .map((resource) => {
      const pascalCase = toPascalCase(resource);
      const types = [];

      if (fieldsContents['19'] && typeExists(fieldsContents['19'], `${pascalCase}Field`)) {
        types.push(`fieldsV19.${pascalCase}Field`);
      }
      if (fieldsContents['20'] && typeExists(fieldsContents['20'], `${pascalCase}Field`)) {
        types.push(`fieldsV20.${pascalCase}Field`);
      }
      if (fieldsContents['21'] && typeExists(fieldsContents['21'], `${pascalCase}Field`)) {
        types.push(`fieldsV21.${pascalCase}Field`);
      }

      if (types.length === 0) return null;
      return `  ${resource}: ${types.join(' | ')};`;
    })
    .filter(Boolean)
    .join('\n');

  // Generate Metric interface properties
  const metricInterfaceProps = sortedResources
    .map((resource) => {
      const pascalCase = toPascalCase(resource);
      const types = [];

      if (fieldsContents['19'] && typeExists(fieldsContents['19'], `${pascalCase}Metric`)) {
        types.push(`fieldsV19.${pascalCase}Metric`);
      }
      if (fieldsContents['20'] && typeExists(fieldsContents['20'], `${pascalCase}Metric`)) {
        types.push(`fieldsV20.${pascalCase}Metric`);
      }
      if (fieldsContents['21'] && typeExists(fieldsContents['21'], `${pascalCase}Metric`)) {
        types.push(`fieldsV21.${pascalCase}Metric`);
      }

      if (types.length === 0) return null;
      return `  ${resource}: ${types.join(' | ')};`;
    })
    .filter(Boolean)
    .join('\n');

  // Generate Segment interface properties
  const segmentInterfaceProps = sortedResources
    .map((resource) => {
      const pascalCase = toPascalCase(resource);
      const types = [];

      if (fieldsContents['19'] && typeExists(fieldsContents['19'], `${pascalCase}Segment`)) {
        types.push(`fieldsV19.${pascalCase}Segment`);
      }
      if (fieldsContents['20'] && typeExists(fieldsContents['20'], `${pascalCase}Segment`)) {
        types.push(`fieldsV20.${pascalCase}Segment`);
      }
      if (fieldsContents['21'] && typeExists(fieldsContents['21'], `${pascalCase}Segment`)) {
        types.push(`fieldsV21.${pascalCase}Segment`);
      }

      if (types.length === 0) return null;
      return `  ${resource}: ${types.join(' | ')};`;
    })
    .filter(Boolean)
    .join('\n');

  const typeDefinitions = `// Auto-generated by scripts/extract.js
// Do not edit manually - regenerate by running: node scripts/extract.js

import type { fields as fieldsV19 } from 'google-ads-api-v19';
import type { fields as fieldsV20 } from 'google-ads-api-v20';
import type { fields as fieldsV21 } from 'google-ads-api-v21';

type MetricV19 = fieldsV19.Metric;
type MetricV20 = fieldsV20.Metric;
type MetricV21 = fieldsV21.Metric;

type SegmentV19 = fieldsV19.Segment;
type SegmentV20 = fieldsV20.Segment;
type SegmentV21 = fieldsV21.Segment;

/**
 * Static mapping of resource names to their Field types
 * Supports all ${sortedResources.length} resources across API versions 19, 20, and 21
 */
interface ResourceFieldMapInterface {
${fieldInterfaceProps}
}

/**
 * Static mapping of resource names to their Metric types
 * Falls back to global Metric type for resources without specific metrics
 */
interface ResourceMetricMapInterface {
${metricInterfaceProps}
}

/**
 * Static mapping of resource names to their Segment types
 * Falls back to global Segment type for resources without specific segments
 */
interface ResourceSegmentMapInterface {
${segmentInterfaceProps}
}

/**
 * Map resource name to its corresponding Field type from google-ads-api
 * Uses static interface lookup for better TypeScript performance
 */
export type ResourceFieldMap<TResource extends string> = TResource extends keyof ResourceFieldMapInterface
  ? ResourceFieldMapInterface[TResource]
  : never;

/**
 * Map resource name to its corresponding Metric type from google-ads-api
 * Uses static interface lookup for better TypeScript performance
 */
export type ResourceMetricMap<TResource extends string> = TResource extends keyof ResourceMetricMapInterface
  ? ResourceMetricMapInterface[TResource]
  : MetricV19 | MetricV20 | MetricV21;

/**
 * Map resource name to its corresponding Segment type from google-ads-api
 * Uses static interface lookup for better TypeScript performance
 */
export type ResourceSegmentMap<TResource extends string> = TResource extends keyof ResourceSegmentMapInterface
  ? ResourceSegmentMapInterface[TResource]
  : SegmentV19 | SegmentV20 | SegmentV21;
`;

  // Write to generated file
  const generatedPath = path.join(import.meta.dirname, '..', 'src', 'generated-resource-types.ts');
  fs.writeFileSync(generatedPath, typeDefinitions);

  console.log(`   ✅ Generated ${generatedPath}`);
  console.log(`   📊 Type mappings created for ${sortedResources.length} resources\n`);
}
