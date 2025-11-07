import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createQueryBuilder,
  DefaultQueryValidator,
  GoogleAdsQueryBuilder,
  type QueryExecutor,
  type QueryParser,
  type QueryValidator,
} from './builder.js';
import { setApiVersion, type SupportedApiVersion } from './schema.js';
import { ValidationErrorType, type ValidationResult } from './validator.js';

describe('GoogleAdsQueryBuilder', () => {
  beforeEach(() => {
    setApiVersion('21' as SupportedApiVersion);
  });

  describe('Basic Query Building', () => {
    it('should build a simple SELECT FROM query', () => {
      const builder = new GoogleAdsQueryBuilder();
      const query = builder.from('campaign').select(['campaign.id', 'campaign.name']).build();

      expect(query).toBe('SELECT campaign.id, campaign.name FROM campaign');
    });

    it('should build a query with WHERE clause', () => {
      const builder = new GoogleAdsQueryBuilder();
      const query = builder
        .from('campaign')
        .select(['campaign.id', 'campaign.name'])
        .where('campaign.status = "ENABLED"')
        .build();

      expect(query).toBe(
        'SELECT campaign.id, campaign.name FROM campaign WHERE campaign.status = "ENABLED"',
      );
    });

    it('should build a query with multiple WHERE conditions', () => {
      const builder = new GoogleAdsQueryBuilder();
      const query = builder
        .from('campaign')
        .select(['campaign.id'])
        .where('campaign.status = "ENABLED"')
        .where('metrics.impressions > 1000')
        .build();

      expect(query).toBe(
        'SELECT campaign.id FROM campaign WHERE campaign.status = "ENABLED" AND metrics.impressions > 1000',
      );
    });

    it('should build a query with ORDER BY clause', () => {
      const builder = new GoogleAdsQueryBuilder();
      const query = builder
        .from('campaign')
        .select(['campaign.id', 'metrics.impressions'])
        .orderBy('metrics.impressions', 'DESC')
        .build();

      expect(query).toBe(
        'SELECT campaign.id, metrics.impressions FROM campaign ORDER BY metrics.impressions DESC',
      );
    });

    it('should build a query with ORDER BY ASC (default)', () => {
      const builder = new GoogleAdsQueryBuilder();
      const query = builder
        .from('campaign')
        .select(['campaign.id', 'campaign.name'])
        .orderBy('campaign.name')
        .build();

      expect(query).toBe(
        'SELECT campaign.id, campaign.name FROM campaign ORDER BY campaign.name ASC',
      );
    });

    it('should build a query with LIMIT clause', () => {
      const builder = new GoogleAdsQueryBuilder();
      const query = builder
        .from('campaign')
        .select(['campaign.id', 'campaign.name'])
        .limit(100)
        .build();

      expect(query).toBe('SELECT campaign.id, campaign.name FROM campaign LIMIT 100');
    });

    it('should build a query with PARAMETERS clause', () => {
      const builder = new GoogleAdsQueryBuilder();
      const query = builder
        .from('campaign')
        .select(['campaign.id'])
        .parameters(['include_drafts=true'])
        .build();

      expect(query).toBe('SELECT campaign.id FROM campaign PARAMETERS include_drafts=true');
    });

    it('should build a complex query with all clauses', () => {
      const builder = new GoogleAdsQueryBuilder();
      const query = builder
        .from('campaign')
        .select(['campaign.id', 'campaign.name', 'metrics.impressions', 'metrics.clicks'])
        .where('campaign.status = "ENABLED"')
        .where('metrics.impressions > 1000')
        .orderBy('metrics.impressions', 'DESC')
        .limit(50)
        .build();

      expect(query).toBe(
        'SELECT campaign.id, campaign.name, metrics.impressions, metrics.clicks FROM campaign WHERE campaign.status = "ENABLED" AND metrics.impressions > 1000 ORDER BY metrics.impressions DESC LIMIT 50',
      );
    });

    it('should build a query with multiple ORDER BY fields', () => {
      const builder = new GoogleAdsQueryBuilder();
      const query = builder
        .from('campaign')
        .select(['campaign.id', 'metrics.impressions'])
        .orderBy('metrics.impressions', 'DESC')
        .orderBy('campaign.id', 'ASC')
        .build();

      expect(query).toBe(
        'SELECT campaign.id, metrics.impressions FROM campaign ORDER BY metrics.impressions DESC, campaign.id ASC',
      );
    });
  });

  describe('Method Chaining', () => {
    it('should support method chaining', () => {
      const builder = new GoogleAdsQueryBuilder();
      const result = builder.from('campaign').select(['campaign.id']).where('campaign.status = "ENABLED"');

      expect(result).toBeInstanceOf(GoogleAdsQueryBuilder);
    });

    it('should allow multiple select calls', () => {
      const builder = new GoogleAdsQueryBuilder();
      const query = builder
        .from('campaign')
        .select(['campaign.id', 'campaign.name'])
        .select(['metrics.impressions'])
        .build();

      expect(query).toBe(
        'SELECT campaign.id, campaign.name, metrics.impressions FROM campaign',
      );
    });

    it('should allow building query step by step', () => {
      const builder = new GoogleAdsQueryBuilder();

      builder.from('campaign');
      builder.select(['campaign.id']);
      builder.where('campaign.status = "ENABLED"');
      builder.limit(10);

      const query = builder.build();
      expect(query).toBe(
        'SELECT campaign.id FROM campaign WHERE campaign.status = "ENABLED" LIMIT 10',
      );
    });
  });

  describe('Type Inference', () => {
    it('should infer resource type from from() method', () => {
      const builder = new GoogleAdsQueryBuilder().from('campaign');

      // TypeScript should infer the resource type
      expect(builder).toBeInstanceOf(GoogleAdsQueryBuilder);
    });

    it('should allow querying different resources', () => {
      const campaignQuery = new GoogleAdsQueryBuilder()
        .from('campaign')
        .select(['campaign.id'])
        .build();

      const adGroupQuery = new GoogleAdsQueryBuilder()
        .from('ad_group')
        .select(['ad_group.id'])
        .build();

      expect(campaignQuery).toBe('SELECT campaign.id FROM campaign');
      expect(adGroupQuery).toBe('SELECT ad_group.id FROM ad_group');
    });
  });

  describe('Validation', () => {
    it('should validate a valid query', () => {
      const builder = new GoogleAdsQueryBuilder();
      builder.from('campaign').select(['campaign.id', 'campaign.name']);

      const result = builder.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing SELECT clause', () => {
      const builder = new GoogleAdsQueryBuilder({ autoValidate: false });
      builder.from('campaign');

      const result = builder.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.type === ValidationErrorType.MISSING_SELECT)).toBe(true);
    });

    it('should detect missing FROM clause', () => {
      const builder = new GoogleAdsQueryBuilder({ autoValidate: false });
      builder.select(['campaign.id']);

      const result = builder.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.type === ValidationErrorType.MISSING_FROM)).toBe(true);
    });

    it('should detect invalid resource name', () => {
      const builder = new GoogleAdsQueryBuilder({ autoValidate: false });
      builder.from('invalid_resource').select(['campaign.id']);

      const result = builder.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.type === ValidationErrorType.INVALID_RESOURCE)).toBe(
        true,
      );
    });

    it('should detect invalid field names', () => {
      const builder = new GoogleAdsQueryBuilder({ autoValidate: false });
      builder.from('campaign').select(['campaign.invalid_field']);

      const result = builder.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.type === ValidationErrorType.INVALID_FIELD)).toBe(true);
    });

    it('should throw error when autoValidate is enabled and query is invalid', () => {
      const builder = new GoogleAdsQueryBuilder({ autoValidate: true });
      builder.from('invalid_resource').select(['campaign.id']);

      expect(() => builder.build()).toThrow('Query validation failed');
    });

    it('should not throw error when autoValidate is disabled', () => {
      const builder = new GoogleAdsQueryBuilder({ autoValidate: false });
      builder.from('invalid_resource').select(['campaign.id']);

      expect(() => builder.build()).not.toThrow();
    });
  });

  describe('Dependency Injection', () => {
    it('should use custom validator', () => {
      const customValidator: QueryValidator = {
        validate: vi.fn().mockReturnValue({
          valid: false,
          errors: [
            {
              type: ValidationErrorType.INVALID_SYNTAX,
              message: 'Custom validation error',
              line: 1,
              column: 1,
              length: 1,
            },
          ],
        }),
      };

      const builder = new GoogleAdsQueryBuilder({ validator: customValidator });
      builder.from('campaign').select(['campaign.id']);

      const result = builder.validate();

      expect(customValidator.validate).toHaveBeenCalled();
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('Custom validation error');
    });

    it('should use default validator when none provided', () => {
      const builder = new GoogleAdsQueryBuilder();
      builder.from('campaign').select(['campaign.id']);

      const result = builder.validate();
      expect(result.valid).toBe(true);
    });

    it('should execute query with custom executor', async () => {
      const mockResults = [{ campaign: { id: '123', name: 'Test Campaign' } }];
      const customExecutor: QueryExecutor = {
        execute: vi.fn().mockResolvedValue(mockResults),
      };

      const builder = new GoogleAdsQueryBuilder({ executor: customExecutor });
      const query = builder.from('campaign').select(['campaign.id', 'campaign.name']);

      const results = await query.execute();

      expect(customExecutor.execute).toHaveBeenCalledWith(
        'SELECT campaign.id, campaign.name FROM campaign',
      );
      expect(results).toEqual(mockResults);
    });

    it('should throw error when executing without executor', async () => {
      const builder = new GoogleAdsQueryBuilder();
      builder.from('campaign').select(['campaign.id']);

      await expect(builder.execute()).rejects.toThrow('No executor configured');
    });

    it('should parse query with custom parser', () => {
      const mockParsed = { resource: 'campaign', fields: ['campaign.id'] };
      const customParser: QueryParser = {
        parse: vi.fn().mockReturnValue(mockParsed),
      };

      const builder = new GoogleAdsQueryBuilder({ parser: customParser });
      builder.from('campaign').select(['campaign.id']);

      const parsed = builder.parse();

      expect(customParser.parse).toHaveBeenCalledWith('SELECT campaign.id FROM campaign');
      expect(parsed).toEqual(mockParsed);
    });

    it('should throw error when parsing without parser', () => {
      const builder = new GoogleAdsQueryBuilder();
      builder.from('campaign').select(['campaign.id']);

      expect(() => builder.parse()).toThrow('No parser configured');
    });
  });

  describe('Helper Methods', () => {
    it('should get available fields for a resource', () => {
      const builder = new GoogleAdsQueryBuilder().from('campaign');
      const fields = builder.getAvailableFields();

      expect(fields.length).toBeGreaterThan(0);
      expect(fields.some((f) => f.startsWith('campaign.'))).toBe(true);
      expect(fields.some((f) => f.startsWith('metrics.'))).toBe(true);
      expect(fields.some((f) => f.startsWith('segments.'))).toBe(true);
    });

    it('should return empty array when no resource is set', () => {
      const builder = new GoogleAdsQueryBuilder();
      const fields = builder.getAvailableFields();

      expect(fields).toEqual([]);
    });

    it('should get available resources', () => {
      const resources = GoogleAdsQueryBuilder.getAvailableResources();

      expect(resources.length).toBeGreaterThan(0);
      expect(resources).toContain('campaign');
      expect(resources).toContain('ad_group');
      expect(resources).toContain('customer');
    });

    it('should reset builder state', () => {
      const builder = new GoogleAdsQueryBuilder();
      builder
        .from('campaign')
        .select(['campaign.id'])
        .where('campaign.status = "ENABLED"')
        .limit(10);

      builder.reset();

      const query = builder.from('ad_group').select(['ad_group.id']).build();
      expect(query).toBe('SELECT ad_group.id FROM ad_group');
    });

    it('should clone builder with same configuration', () => {
      const customValidator: QueryValidator = {
        validate: vi.fn().mockReturnValue({ valid: true, errors: [] }),
      };

      const builder = new GoogleAdsQueryBuilder({ validator: customValidator });
      builder.from('campaign').select(['campaign.id']).where('campaign.status = "ENABLED"');

      const cloned = builder.clone();
      const query = cloned.build();

      expect(query).toBe(
        'SELECT campaign.id FROM campaign WHERE campaign.status = "ENABLED"',
      );
      expect(customValidator.validate).toHaveBeenCalled();
    });

    it('should create independent clones', () => {
      const builder = new GoogleAdsQueryBuilder();
      builder.from('campaign').select(['campaign.id']);

      const cloned = builder.clone();
      cloned.select(['campaign.name']);

      const originalQuery = builder.build();
      const clonedQuery = cloned.build();

      expect(originalQuery).toBe('SELECT campaign.id FROM campaign');
      expect(clonedQuery).toBe('SELECT campaign.id, campaign.name FROM campaign');
    });
  });

  describe('DefaultQueryValidator', () => {
    it('should validate queries correctly', () => {
      const validator = new DefaultQueryValidator();
      const result = validator.validate('SELECT campaign.id, campaign.name FROM campaign');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect validation errors', () => {
      const validator = new DefaultQueryValidator();
      const result = validator.validate('SELECT campaign.invalid_field FROM campaign');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('createQueryBuilder Factory', () => {
    it('should create a new builder instance', () => {
      const builder = createQueryBuilder();
      expect(builder).toBeInstanceOf(GoogleAdsQueryBuilder);
    });

    it('should accept configuration', () => {
      const customValidator: QueryValidator = {
        validate: vi.fn().mockReturnValue({ valid: true, errors: [] }),
      };

      const builder = createQueryBuilder({ validator: customValidator });
      builder.from('campaign').select(['campaign.id']);

      builder.validate();
      expect(customValidator.validate).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty select array', () => {
      const builder = new GoogleAdsQueryBuilder({ autoValidate: false });
      const query = builder.from('campaign').select([]).build();

      expect(query).toBe('FROM campaign');
    });

    it('should handle query with only FROM clause', () => {
      const builder = new GoogleAdsQueryBuilder({ autoValidate: false });
      const query = builder.from('campaign').build();

      expect(query).toBe('FROM campaign');
    });

    it('should handle multiple parameters', () => {
      const builder = new GoogleAdsQueryBuilder();
      const query = builder
        .from('campaign')
        .select(['campaign.id'])
        .parameters(['include_drafts=true', 'use_raw_enum_values=true'])
        .build();

      expect(query).toBe(
        'SELECT campaign.id FROM campaign PARAMETERS include_drafts=true,use_raw_enum_values=true',
      );
    });

    it('should preserve order of clauses', () => {
      const builder = new GoogleAdsQueryBuilder();
      const query = builder
        .limit(10) // Add limit first
        .orderBy('campaign.id') // Then order by
        .where('campaign.status = "ENABLED"') // Then where
        .select(['campaign.id']) // Then select
        .from('campaign') // Finally from
        .build();

      // Should still output in correct GAQL order
      expect(query).toBe(
        'SELECT campaign.id FROM campaign WHERE campaign.status = "ENABLED" ORDER BY campaign.id ASC LIMIT 10',
      );
    });
  });

  describe('Real-world Examples', () => {
    it('should build a campaign performance query', () => {
      const builder = new GoogleAdsQueryBuilder();
      const query = builder
        .from('campaign')
        .select([
          'campaign.id',
          'campaign.name',
          'campaign.status',
          'metrics.impressions',
          'metrics.clicks',
          'metrics.cost_micros',
          'metrics.conversions',
        ])
        .where('campaign.status = "ENABLED"')
        .where('metrics.impressions > 0')
        .orderBy('metrics.impressions', 'DESC')
        .limit(100)
        .build();

      expect(query).toContain('SELECT campaign.id, campaign.name');
      expect(query).toContain('FROM campaign');
      expect(query).toContain('WHERE campaign.status = "ENABLED" AND metrics.impressions > 0');
      expect(query).toContain('ORDER BY metrics.impressions DESC');
      expect(query).toContain('LIMIT 100');
    });

    it('should build an ad group query with segmentation', () => {
      const builder = new GoogleAdsQueryBuilder();
      const query = builder
        .from('ad_group')
        .select([
          'campaign.id',
          'ad_group.id',
          'ad_group.name',
          'segments.date',
          'metrics.impressions',
          'metrics.clicks',
        ])
        .where('segments.date DURING LAST_30_DAYS')
        .orderBy('segments.date', 'DESC')
        .build();

      expect(query).toContain('FROM ad_group');
      expect(query).toContain('segments.date');
      expect(query).toContain('WHERE segments.date DURING LAST_30_DAYS');
    });

    it('should build a customer query', () => {
      const builder = new GoogleAdsQueryBuilder();
      const query = builder
        .from('customer')
        .select(['customer.id', 'customer.descriptive_name', 'customer.currency_code'])
        .build();

      expect(query).toBe(
        'SELECT customer.id, customer.descriptive_name, customer.currency_code FROM customer',
      );
    });
  });
});
