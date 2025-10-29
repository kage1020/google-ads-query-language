import { describe, expect, it } from 'vitest';
import {
  getFieldsForResource,
  getMetricsForResource,
  getResourceNames,
  getSegmentsForResource,
} from './schema.js';

describe('schema.ts', () => {
  describe('Resource Names', () => {
    it('should return an array of resource names', () => {
      const resources = getResourceNames('21');
      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
    });

    it('should include common resources', () => {
      const resources = getResourceNames('21');
      expect(resources).toContain('campaign');
      expect(resources).toContain('ad_group');
      expect(resources).toContain('ad_group_ad');
    });

    it('should return unique resource names', () => {
      const resources = getResourceNames('21');
      const uniqueResources = [...new Set(resources)];
      expect(resources.length).toBe(uniqueResources.length);
    });

    it('should be case-sensitive', () => {
      const resources = getResourceNames('21');
      // Resource names should be lowercase with underscores
      for (const resource of resources) {
        expect(resource).toBe(resource.toLowerCase());
      }
    });
  });

  describe('Fields for Resource', () => {
    it('should return fields for campaign resource', () => {
      const fields = getFieldsForResource('campaign', '21');
      expect(Array.isArray(fields)).toBe(true);
      expect(fields.length).toBeGreaterThan(0);
    });

    it('should return empty array for invalid resource', () => {
      // @ts-expect-error Testing invalid resource name
      const fields = getFieldsForResource('invalid_resource_name', '21');
      expect(fields).toEqual([]);
    });

    it('should return fields with proper structure', () => {
      const fields = getFieldsForResource('campaign', '21');
      expect(fields.length).toBeGreaterThan(0);

      const field = fields[0];
      expect(field).toHaveProperty('name');
      expect(field).toHaveProperty('type');
      expect(field).toHaveProperty('description');
      expect(typeof field.name).toBe('string');
      expect(typeof field.type).toBe('string');
      expect(typeof field.description).toBe('string');
    });

    it('should include id field for campaign resource', () => {
      const fields = getFieldsForResource('campaign', '21');
      const idField = fields.find((f) => f.name === 'id');
      expect(idField).toBeDefined();
      // Field should have a type property
      expect(idField?.type).toBeTruthy();
    });

    it('should handle different API versions', () => {
      const fieldsV19 = getFieldsForResource('campaign', '19');
      const fieldsV21 = getFieldsForResource('campaign', '21');

      // Both versions should have fields
      expect(fieldsV19.length).toBeGreaterThan(0);
      expect(fieldsV21.length).toBeGreaterThan(0);
    });
  });

  describe('Metrics for Resource', () => {
    it('should return metrics for campaign resource', () => {
      const metrics = getMetricsForResource('campaign', '21');
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should return empty array for invalid resource', () => {
      // @ts-expect-error Testing invalid resource name
      const metrics = getMetricsForResource('invalid_resource_name', '21');
      expect(metrics).toEqual([]);
    });

    it('should have proper structure', () => {
      const metrics = getMetricsForResource('campaign', '21');
      if (metrics.length > 0) {
        const metric = metrics[0];
        expect(metric).toHaveProperty('name');
        expect(metric).toHaveProperty('type');
        expect(metric).toHaveProperty('description');
      }
    });

    it('should include common metrics', () => {
      const metrics = getMetricsForResource('campaign', '21');
      // Metrics should exist for campaign resource
      expect(metrics.length).toBeGreaterThan(0);
      // Check that metrics have proper structure
      if (metrics.length > 0) {
        const metric = metrics[0];
        expect(metric.name).toBeTruthy();
        expect(metric.type).toBeTruthy();
      }
    });
  });

  describe('Segments for Resource', () => {
    it('should return segments for resources that support them', () => {
      const segments = getSegmentsForResource('campaign', '21');
      expect(Array.isArray(segments)).toBe(true);
      // Segments may be empty for some resources
    });

    it('should return empty array for invalid resource', () => {
      // @ts-expect-error Testing invalid resource name
      const segments = getSegmentsForResource('invalid_resource_name', '21');
      expect(segments).toEqual([]);
    });

    it('should have proper structure when segments exist', () => {
      const segments = getSegmentsForResource('campaign', '21');
      if (segments.length > 0) {
        const segment = segments[0];
        expect(segment).toHaveProperty('name');
        expect(segment).toHaveProperty('type');
        expect(segment).toHaveProperty('description');
      }
    });
  });
});
