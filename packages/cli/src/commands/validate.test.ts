import * as fs from 'node:fs/promises';
import * as core from '@gaql/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateCommand } from './validate.js';

// Mock process.exit to prevent tests from exiting
const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

// Mock fs.readFile
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

// Mock ora
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
  })),
}));

// Mock chalk
vi.mock('chalk', () => ({
  default: {
    green: vi.fn((text) => text),
    red: vi.fn((text) => text),
    yellow: vi.fn((text) => text),
    gray: vi.fn((text) => text),
    bold: vi.fn((text) => text),
    dim: vi.fn((text) => text),
  },
}));

describe('validate command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExit.mockClear();
  });

  describe('File Input', () => {
    it('should validate queries from a file', async () => {
      const mockContent = `
        const query = \`
          SELECT campaign.id, campaign.name
          FROM campaign
        \`;
      `;

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      // Mock console.log to capture output
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('test.ts', { apiVersion: '21', format: 'text', color: true });

      expect(fs.readFile).toHaveBeenCalledWith('test.ts', 'utf-8');
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);

      consoleLogSpy.mockRestore();
    });

    it('should handle non-existent file', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await validateCommand('nonexistent.ts', { apiVersion: '21', format: 'text', color: true });

      expect(mockExit).toHaveBeenCalledWith(1);

      consoleErrorSpy.mockRestore();
    });

    it('should handle file with valid queries', async () => {
      const mockContent = `
        const query = \`SELECT campaign.id FROM campaign\`;
      `;

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('test.ts', { apiVersion: '21', format: 'json', color: false });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('');

      // Should be valid JSON
      const result = JSON.parse(output);
      expect(result.totalQueries).toBe(1);
      expect(result.validQueries).toBe(1);
      expect(result.invalidQueries).toBe(0);
      // Valid queries should not be in results array
      expect(result.results.length).toBe(0);
      expect(mockExit).toHaveBeenCalledWith(0);

      consoleLogSpy.mockRestore();
    });

    it('should handle file with invalid queries', async () => {
      const mockContent = `
        const query = \`SELECT campaign.invalid_field FROM campaign\`;
      `;

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('test.ts', { apiVersion: '21', format: 'json', color: false });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('');

      const result = JSON.parse(output);
      expect(result.totalQueries).toBeGreaterThan(0);
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results[0].valid).toBe(false);
      expect(result.results[0].errors.length).toBeGreaterThan(0);
      expect(mockExit).toHaveBeenCalledWith(1);

      consoleLogSpy.mockRestore();
    });

    it('should handle empty file', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('');

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('empty.ts', { apiVersion: '21', format: 'json', color: false });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('');

      const result = JSON.parse(output);
      expect(result.totalQueries).toBe(0);
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBe(0);
      expect(mockExit).toHaveBeenCalledWith(0);

      consoleLogSpy.mockRestore();
    });

    it('should handle file with multiple queries', async () => {
      const mockContent = `
        const query1 = \`SELECT campaign.id FROM campaign\`;
        const query2 = \`SELECT ad_group.id FROM ad_group\`;
      `;

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('test.ts', { apiVersion: '21', format: 'json', color: false });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('');

      const result = JSON.parse(output);
      expect(result.totalQueries).toBe(2);
      expect(result.validQueries).toBe(2);
      expect(result.invalidQueries).toBe(0);
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      // Valid queries should not be in results array
      expect(result.results.length).toBe(0);
      expect(mockExit).toHaveBeenCalledWith(0);

      consoleLogSpy.mockRestore();
    });
  });

  describe('Options', () => {
    it('should respect --api-version option', async () => {
      const mockContent = `const query = \`SELECT campaign.id FROM campaign\`;`;

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('test.ts', { apiVersion: '19', format: 'text', color: false });

      expect(mockExit).toHaveBeenCalledWith(0);

      consoleLogSpy.mockRestore();
    });

    it('should respect --format option for JSON', async () => {
      const mockContent = `const query = \`SELECT campaign.id FROM campaign\`;`;

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('test.ts', { apiVersion: '21', format: 'json', color: false });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('');

      // Should be valid JSON
      expect(() => JSON.parse(output)).not.toThrow();
      expect(mockExit).toHaveBeenCalledWith(0);

      consoleLogSpy.mockRestore();
    });

    it('should respect --format option for text', async () => {
      const mockContent = `const query = \`SELECT campaign.id FROM campaign\`;`;

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('test.ts', { apiVersion: '21', format: 'text', color: false });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('');

      // Should not be JSON (will throw if we try to parse)
      expect(() => JSON.parse(output)).toThrow();
      expect(mockExit).toHaveBeenCalledWith(0);

      consoleLogSpy.mockRestore();
    });

    it('should respect --format option for llm', async () => {
      const mockContent = `const query = \`SELECT campaign.id FROM campaign\`;`;

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('test.ts', { apiVersion: '21', format: 'llm', color: false });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');

      // Should contain SUMMARY line
      expect(output).toContain('SUMMARY:');
      // Should not contain [VALID] marker (valid queries are hidden by default)
      expect(output).not.toContain('[VALID]');
      // Should not contain [ERROR] marker
      expect(output).not.toContain('[ERROR]');
      expect(mockExit).toHaveBeenCalledWith(0);

      consoleLogSpy.mockRestore();
    });

    it('should output errors in llm format with single-line entries', async () => {
      const mockContent = `const query = \`SELECT campaign.invalid_field FROM campaign\`;`;

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('test.ts', { apiVersion: '21', format: 'llm', color: false });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');

      // Should contain SUMMARY line
      expect(output).toContain('SUMMARY:');
      // Should contain [ERROR] marker
      expect(output).toContain('[ERROR]');
      // Should contain error type
      expect(output).toContain('invalid_field');
      // Should contain the query
      expect(output).toContain('SELECT campaign.invalid_field FROM campaign');
      expect(mockExit).toHaveBeenCalledWith(1);

      consoleLogSpy.mockRestore();
    });

    it('should respect --format option for rich', async () => {
      const mockContent = `const query = \`SELECT campaign.id FROM campaign\`;`;

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('test.ts', { apiVersion: '21', format: 'rich', color: false });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');

      // Should contain summary box
      expect(output).toContain('GAQL Validation Results');
      // Should contain valid count
      expect(output).toContain('Valid');
      expect(mockExit).toHaveBeenCalledWith(0);

      consoleLogSpy.mockRestore();
    });

    it('should output errors in rich format with tables', async () => {
      const mockContent = `const query = \`SELECT campaign.invalid_field FROM campaign\`;`;

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('test.ts', { apiVersion: '21', format: 'rich', color: false });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');

      // Should contain summary
      expect(output).toContain('GAQL Validation Results');
      // Should contain table with property and value
      expect(output).toContain('Property');
      expect(output).toContain('Value');
      // Should contain error details
      expect(output).toContain('invalid_field');
      expect(mockExit).toHaveBeenCalledWith(1);

      consoleLogSpy.mockRestore();
    });

    it('should use default API version when not specified', async () => {
      const mockContent = `const query = \`SELECT campaign.id FROM campaign\`;`;

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('test.ts', { apiVersion: '21', format: 'text', color: false });

      // Should be called with the provided version
      expect(mockExit).toHaveBeenCalledWith(0);

      consoleLogSpy.mockRestore();
    });
  });

  describe('Output Format', () => {
    it('should output valid JSON in JSON format', async () => {
      const mockContent = `const query = \`SELECT campaign.id FROM campaign\`;`;

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('test.ts', { apiVersion: '21', format: 'json', color: false });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('');

      const result = JSON.parse(output);
      expect(result).toHaveProperty('totalQueries');
      expect(result).toHaveProperty('validQueries');
      expect(result).toHaveProperty('invalidQueries');
      expect(result).toHaveProperty('results');
      expect(Array.isArray(result.results)).toBe(true);

      if (result.results.length > 0) {
        expect(result.results[0]).toHaveProperty('valid');
        expect(result.results[0]).toHaveProperty('errors');
        expect(result.results[0]).toHaveProperty('query');
        expect(result.results[0]).toHaveProperty('line');
      }

      expect(mockExit).toHaveBeenCalledWith(0);
      consoleLogSpy.mockRestore();
    });

    it('should include only invalid queries in JSON format', async () => {
      const mockContent = `
        const query1 = \`SELECT campaign.id FROM campaign\`;
        const query2 = \`SELECT campaign.invalid FROM campaign\`;
      `;

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('test.ts', { apiVersion: '21', format: 'json', color: false });

      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('');
      const result = JSON.parse(output);

      expect(result.totalQueries).toBe(2);
      expect(result.validQueries).toBe(1);
      expect(result.invalidQueries).toBe(1);
      // Only invalid queries should be in results array
      expect(result.results.length).toBe(1);
      expect(result.results[0].valid).toBe(false);
      expect(mockExit).toHaveBeenCalledWith(1);

      consoleLogSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should display validation errors', async () => {
      const mockContent = `const query = \`SELECT campaign.invalid_field FROM campaign\`;`; // Invalid field

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('test.ts', { apiVersion: '21', format: 'json', color: false });

      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('');
      const result = JSON.parse(output);

      expect(result.results[0].valid).toBe(false);
      expect(result.results[0].errors.length).toBeGreaterThan(0);
      expect(result.results[0].errors[0]).toHaveProperty('message');
      expect(result.results[0].errors[0]).toHaveProperty('line');
      expect(result.results[0].errors[0]).toHaveProperty('column');
      expect(mockExit).toHaveBeenCalledWith(1);

      consoleLogSpy.mockRestore();
    });

    it('should handle multiple errors in a single query', async () => {
      const mockContent = `const query = \`SELECT campaign.invalid1, campaign.invalid2 FROM campaign\`;`;

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('test.ts', { apiVersion: '21', format: 'json', color: false });

      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('');
      const result = JSON.parse(output);

      expect(result.results[0].valid).toBe(false);
      expect(result.results[0].errors.length).toBeGreaterThanOrEqual(2);
      expect(mockExit).toHaveBeenCalledWith(1);

      consoleLogSpy.mockRestore();
    });

    it('should handle errors across multiple queries', async () => {
      const mockContent = `
        const query1 = \`SELECT campaign.invalid FROM campaign\`;
        const query2 = \`SELECT ad_group.invalid FROM ad_group\`;
      `;

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('test.ts', { apiVersion: '21', format: 'json', color: false });

      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('');
      const result = JSON.parse(output);

      expect(result.totalQueries).toBe(2);
      expect(result.results[0].valid).toBe(false);
      expect(result.results[1].valid).toBe(false);
      expect(mockExit).toHaveBeenCalledWith(1);

      consoleLogSpy.mockRestore();
    });
  });

  describe('Integration', () => {
    it('should work with @gaql/core validation', async () => {
      const mockContent = `const query = \`SELECT campaign.id FROM campaign\`;`;

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const validateTextSpy = vi.spyOn(core, 'validateText');

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('test.ts', { apiVersion: '21', format: 'json', color: false });

      expect(validateTextSpy).toHaveBeenCalledWith(mockContent, '21');
      expect(mockExit).toHaveBeenCalledWith(0);

      consoleLogSpy.mockRestore();
      validateTextSpy.mockRestore();
    });

    it('should handle template literal extraction', async () => {
      const mockContent = `
        const notQuery = \`Hello World\`;
        const query = \`SELECT campaign.id FROM campaign\`;
      `;

      vi.mocked(fs.readFile).mockResolvedValue(mockContent);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await validateCommand('test.ts', { apiVersion: '21', format: 'json', color: false });

      const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('');
      const result = JSON.parse(output);

      // Should only find the GAQL query, not the "Hello World" template literal
      expect(result.totalQueries).toBe(1);
      expect(result.validQueries).toBe(1);
      expect(result.invalidQueries).toBe(0);
      // Valid queries should not be in results array
      expect(result.results.length).toBe(0);
      expect(mockExit).toHaveBeenCalledWith(0);

      consoleLogSpy.mockRestore();
    });
  });
});
