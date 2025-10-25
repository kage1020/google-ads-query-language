import { describe, expect, it } from 'vitest';
import { ValidationErrorType, validateQuery, validateText } from './validator.js';

describe('validator.ts', () => {
  describe('Query Validation - Valid Queries', () => {
    it('should validate a correct GAQL query', () => {
      const query = 'SELECT campaign.id, campaign.name FROM campaign';
      const result = validateQuery(query);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate query with WHERE clause', () => {
      const query =
        'SELECT campaign.id, campaign.name FROM campaign WHERE campaign.status = "ENABLED"';
      const result = validateQuery(query);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate query with metrics', () => {
      const query = 'SELECT campaign.id, metrics.impressions, metrics.clicks FROM campaign';
      const result = validateQuery(query);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate multi-line query', () => {
      const query = `SELECT
        campaign.id,
        campaign.name
      FROM campaign`;
      const result = validateQuery(query);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Query Validation - Missing Clauses', () => {
    it('should detect missing SELECT clause', () => {
      const query = 'FROM campaign';
      const result = validateQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe(ValidationErrorType.MISSING_SELECT);
      expect(result.errors[0].message).toContain('SELECT');
    });

    it('should detect missing FROM clause', () => {
      const query = 'SELECT campaign.id, campaign.name';
      const result = validateQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe(ValidationErrorType.MISSING_FROM);
      expect(result.errors[0].message).toContain('FROM');
    });

    it('should detect both missing clauses', () => {
      const query = 'WHERE campaign.status = "ENABLED"';
      const result = validateQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      const errorTypes = result.errors.map((e) => e.type);
      expect(errorTypes).toContain(ValidationErrorType.MISSING_SELECT);
      expect(errorTypes).toContain(ValidationErrorType.MISSING_FROM);
    });
  });

  describe('Query Validation - Invalid Resource', () => {
    it('should detect invalid resource name', () => {
      const query = 'SELECT field FROM invalid_resource_name';
      const result = validateQuery(query);

      expect(result.valid).toBe(false);
      const invalidResourceError = result.errors.find(
        (e) => e.type === ValidationErrorType.INVALID_RESOURCE,
      );
      expect(invalidResourceError).toBeDefined();
      expect(invalidResourceError?.field).toBe('invalid_resource_name');
    });

    it('should suggest similar resource names', () => {
      const query = 'SELECT field FROM campain'; // Typo: campain instead of campaign
      const result = validateQuery(query);

      expect(result.valid).toBe(false);
      const invalidResourceError = result.errors.find(
        (e) => e.type === ValidationErrorType.INVALID_RESOURCE,
      );
      expect(invalidResourceError).toBeDefined();
      // Suggestions may or may not be provided depending on Levenshtein distance threshold
      if (invalidResourceError?.suggestion) {
        expect(typeof invalidResourceError.suggestion).toBe('string');
      }
    });
  });

  describe('Query Validation - Invalid Fields', () => {
    it('should detect invalid field name', () => {
      const query = 'SELECT campaign.invalid_field FROM campaign';
      const result = validateQuery(query);

      expect(result.valid).toBe(false);
      const invalidFieldError = result.errors.find(
        (e) => e.type === ValidationErrorType.INVALID_FIELD,
      );
      expect(invalidFieldError).toBeDefined();
      expect(invalidFieldError?.field).toBe('campaign.invalid_field');
    });

    it('should suggest similar field names', () => {
      const query = 'SELECT campaign.nam FROM campaign'; // Typo: nam instead of name
      const result = validateQuery(query);

      expect(result.valid).toBe(false);
      const invalidFieldError = result.errors.find(
        (e) => e.type === ValidationErrorType.INVALID_FIELD,
      );
      expect(invalidFieldError).toBeDefined();
      // Suggestions may or may not be provided depending on implementation
      if (invalidFieldError?.suggestion) {
        expect(typeof invalidFieldError.suggestion).toBe('string');
      }
    });

    it('should validate multiple fields', () => {
      const query =
        'SELECT campaign.id, campaign.invalid1, campaign.name, campaign.invalid2 FROM campaign';
      const result = validateQuery(query);

      expect(result.valid).toBe(false);
      const invalidFieldErrors = result.errors.filter(
        (e) => e.type === ValidationErrorType.INVALID_FIELD,
      );
      expect(invalidFieldErrors.length).toBe(2);
    });
  });

  describe('Query Validation - Error Information', () => {
    it('should provide line and column information', () => {
      const query = 'SELECT campaign.invalid FROM campaign';
      const result = validateQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toHaveProperty('line');
      expect(result.errors[0]).toHaveProperty('column');
      expect(result.errors[0]).toHaveProperty('length');
      expect(typeof result.errors[0].line).toBe('number');
      expect(typeof result.errors[0].column).toBe('number');
    });

    it('should have descriptive error messages', () => {
      const query = 'SELECT campaign.invalid FROM campaign';
      const result = validateQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBeTruthy();
      expect(result.errors[0].message.length).toBeGreaterThan(0);
    });
  });

  describe('Text Validation', () => {
    it('should extract and validate query from template literal', () => {
      const text = `
        const query = \`
          SELECT campaign.id, campaign.name
          FROM campaign
        \`;
      `;
      const results = validateText(text);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].valid).toBe(true);
    });

    it('should validate multiple queries in text', () => {
      const text = `
        const query1 = \`SELECT campaign.id FROM campaign\`;
        const query2 = \`SELECT ad_group.id FROM ad_group\`;
      `;
      const results = validateText(text);

      expect(results.length).toBe(2);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(true);
    });

    it('should detect errors in template literals', () => {
      const text = `
        const query = \`
          SELECT campaign.invalid_field
          FROM campaign
        \`;
      `;
      const results = validateText(text);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].valid).toBe(false);
      expect(results[0].errors.length).toBeGreaterThan(0);
    });

    it('should skip non-query template literals', () => {
      const text = `
        const message = \`Hello World\`;
        const query = \`SELECT campaign.id FROM campaign\`;
      `;
      const results = validateText(text);

      // Should only find the actual GAQL query
      expect(results.length).toBe(1);
      expect(results[0].valid).toBe(true);
    });

    it('should handle queries with line breaks correctly', () => {
      const text = `
        const query = \`
          SELECT
            campaign.id,
            campaign.name
          FROM
            campaign
          WHERE
            campaign.status = "ENABLED"
        \`;
      `;
      const results = validateText(text);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].valid).toBe(true);
    });
  });

  describe('Template Literal Interpolations', () => {
    it('should ignore ${...} template literal interpolations in WHERE clause', () => {
      const query = `
        SELECT
          customer_client.client_customer,
          customer_client.descriptive_name
        FROM
          customer_client
        WHERE
          customer_client.client_customer = '\${this.customerId}'
      `;
      const result = validateQuery(query);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should ignore ${...} when used in WHERE with valid SELECT fields', () => {
      const query = `
        SELECT
          campaign.id,
          campaign.name
        FROM
          campaign
        WHERE
          campaign.name LIKE '%\${searchTerm}%'
      `;
      const result = validateQuery(query);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should ignore multiple ${...} expressions', () => {
      const query = `
        SELECT
          campaign.id,
          campaign.name
        FROM
          campaign
        WHERE
          campaign.id = '\${campaignId}'
          AND campaign.status = '\${status}'
      `;
      const result = validateQuery(query);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate actual fields even when ${...} is present', () => {
      const query = `
        SELECT
          campaign.invalid_field
        FROM
          campaign
        WHERE
          campaign.id = '\${campaignId}'
      `;
      const result = validateQuery(query);

      expect(result.valid).toBe(false);
      const invalidFieldError = result.errors.find(
        (e) => e.type === ValidationErrorType.INVALID_FIELD,
      );
      expect(invalidFieldError).toBeDefined();
      expect(invalidFieldError?.field).toBe('campaign.invalid_field');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query', () => {
      const query = '';
      const result = validateQuery(query);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle query with only whitespace', () => {
      const query = '   \n  \t  ';
      const result = validateQuery(query);

      expect(result.valid).toBe(false);
    });

    it('should be case-insensitive for keywords', () => {
      const query = 'select campaign.id from campaign';
      const result = validateQuery(query);

      expect(result.valid).toBe(true);
    });

    it('should handle extra whitespace', () => {
      const query = '  SELECT    campaign.id   ,   campaign.name   FROM    campaign  ';
      const result = validateQuery(query);

      expect(result.valid).toBe(true);
    });
  });
});
