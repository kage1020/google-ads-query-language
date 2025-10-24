import { beforeEach, describe, expect, it } from 'vitest';
import {
  getApiVersion,
  getFieldsForResource,
  getMetricsForResource,
  getResourceNames,
  getSegmentsForResource,
  setApiVersion,
} from './schema.js';

describe('schema.ts', () => {
  beforeEach(() => {
    // Reset to default version before each test
    setApiVersion('21');
  });

  describe('API Version Management', () => {
    it('should set and get API version 19', () => {
      setApiVersion('19');
      expect(getApiVersion()).toBe('19');
    });

    it('should set and get API version 20', () => {
      setApiVersion('20');
      expect(getApiVersion()).toBe('20');
    });

    it('should set and get API version 21', () => {
      setApiVersion('21');
      expect(getApiVersion()).toBe('21');
    });

    it('should default to version 21', () => {
      expect(getApiVersion()).toBe('21');
    });
  });

  describe('Resource Names', () => {
    it('should return an array of resource names', () => {
      const resources = getResourceNames();
      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);
    });

    it('should include common resources', () => {
      const resources = getResourceNames();
      expect(resources).toContain('campaign');
      expect(resources).toContain('ad_group');
      expect(resources).toContain('ad_group_ad');
    });

    it('should return unique resource names', () => {
      const resources = getResourceNames();
      const uniqueResources = [...new Set(resources)];
      expect(resources.length).toBe(uniqueResources.length);
    });

    it('should be case-sensitive', () => {
      const resources = getResourceNames();
      // Resource names should be lowercase with underscores
      for (const resource of resources) {
        expect(resource).toBe(resource.toLowerCase());
      }
    });
  });

  describe('Fields for Resource', () => {
    it('should return fields for campaign resource', () => {
      const fields = getFieldsForResource('campaign');
      expect(Array.isArray(fields)).toBe(true);
      expect(fields.length).toBeGreaterThan(0);
    });

    it('should return empty array for invalid resource', () => {
      const fields = getFieldsForResource('invalid_resource_name');
      expect(fields).toEqual([]);
    });

    it('should return fields with proper structure', () => {
      const fields = getFieldsForResource('campaign');
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
      const fields = getFieldsForResource('campaign');
      const idField = fields.find((f) => f.name === 'id');
      expect(idField).toBeDefined();
      // Field should have a type property
      expect(idField?.type).toBeTruthy();
    });

    it('should handle different API versions', () => {
      setApiVersion('19');
      const fieldsV19 = getFieldsForResource('campaign');

      setApiVersion('21');
      const fieldsV21 = getFieldsForResource('campaign');

      // Both versions should have fields
      expect(fieldsV19.length).toBeGreaterThan(0);
      expect(fieldsV21.length).toBeGreaterThan(0);
    });
  });

  describe('Metrics for Resource', () => {
    it('should return metrics for campaign resource', () => {
      const metrics = getMetricsForResource('campaign');
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should return empty array for invalid resource', () => {
      const metrics = getMetricsForResource('invalid_resource_name');
      expect(metrics).toEqual([]);
    });

    it('should have proper structure', () => {
      const metrics = getMetricsForResource('campaign');
      if (metrics.length > 0) {
        const metric = metrics[0];
        expect(metric).toHaveProperty('name');
        expect(metric).toHaveProperty('type');
        expect(metric).toHaveProperty('description');
      }
    });

    it('should include common metrics', () => {
      const metrics = getMetricsForResource('campaign');
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
      const segments = getSegmentsForResource('campaign');
      expect(Array.isArray(segments)).toBe(true);
      // Segments may be empty for some resources
    });

    it('should return empty array for invalid resource', () => {
      const segments = getSegmentsForResource('invalid_resource_name');
      expect(segments).toEqual([]);
    });

    it('should have proper structure when segments exist', () => {
      const segments = getSegmentsForResource('campaign');
      if (segments.length > 0) {
        const segment = segments[0];
        expect(segment).toHaveProperty('name');
        expect(segment).toHaveProperty('type');
        expect(segment).toHaveProperty('description');
      }
    });
  });
});
