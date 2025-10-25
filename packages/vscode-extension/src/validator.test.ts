import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { GAQLValidator } from './validator.js';
import { initializeLocalization } from './localization.js';

// Mock vscode module
vi.mock('vscode', async () => {
  const actual = await vi.importActual<typeof import('vscode')>('vscode');
  return {
    ...actual,
    workspace: {
      getConfiguration: vi.fn(() => ({
        get: vi.fn((key: string) => {
          if (key === 'enabled') return true;
          if (key === 'activationMode') return 'always';
          if (key === 'language') return 'ja';
          return undefined;
        }),
      })),
    },
    env: {
      language: 'ja',
    },
    languages: {
      createDiagnosticCollection: vi.fn(() => ({
        set: vi.fn(),
        clear: vi.fn(),
        delete: vi.fn(),
        dispose: vi.fn(),
      })),
    },
    DiagnosticSeverity: {
      Error: 0,
      Warning: 1,
      Information: 2,
      Hint: 3,
    },
    Range: class Range {
      constructor(
        public startLine: number,
        public startCharacter: number,
        public endLine: number,
        public endCharacter: number,
      ) {}
    },
    Diagnostic: class Diagnostic {
      constructor(
        public range: any,
        public message: string,
        public severity?: number,
      ) {}
      source?: string;
      code?: string;
    },
    CodeActionKind: {
      QuickFix: 'quickfix',
    },
  };
});

describe('GAQLValidator', () => {
  beforeEach(() => {
    // Initialize localization to Japanese for testing
    initializeLocalization('ja');
  });

  describe('Template Literal Interpolations', () => {
    it('should not report errors for ${...} in WHERE clause', async () => {
      const diagnosticCollection = vscode.languages.createDiagnosticCollection('gaql');
      const validator = new GAQLValidator(diagnosticCollection);

      const documentText = `
        // @gaql
        const query = \`
          SELECT
            customer_client.client_customer,
            customer_client.descriptive_name
          FROM
            customer_client
          WHERE
            customer_client.client_customer = '\${this.customerId}'
        \`;
      `;

      const document = {
        getText: () => documentText,
        uri: { fsPath: 'test.ts' },
      } as any;

      await validator.validateDocument(document);

      const setCalls = vi.mocked(diagnosticCollection.set).mock.calls;
      expect(setCalls.length).toBeGreaterThan(0);

      const diagnostics = setCalls[setCalls.length - 1][1];
      expect(diagnostics).toHaveLength(0);
    });

    it('should report errors for invalid fields even with ${...} present', async () => {
      const diagnosticCollection = vscode.languages.createDiagnosticCollection('gaql');
      const validator = new GAQLValidator(diagnosticCollection);

      const documentText = `
        // @gaql
        const query = \`
          SELECT
            customer_client.invalid_field
          FROM
            customer_client
          WHERE
            customer_client.client_customer = '\${this.customerId}'
        \`;
      `;

      const document = {
        getText: () => documentText,
        uri: { fsPath: 'test.ts' },
      } as any;

      await validator.validateDocument(document);

      const setCalls = vi.mocked(diagnosticCollection.set).mock.calls;
      expect(setCalls.length).toBeGreaterThan(0);

      const diagnostics = setCalls[setCalls.length - 1][1];
      expect(diagnostics.length).toBeGreaterThan(0);

      // Check that error message is properly formatted in Japanese
      const diagnostic = diagnostics[0];
      expect(diagnostic.message).toContain('customer_client');
      expect(diagnostic.message).toContain('invalid_field');
      expect(diagnostic.message).not.toContain('{0}');
      expect(diagnostic.message).not.toContain('{1}');
    });

    it('should format INVALID_FIELD error message correctly in Japanese', async () => {
      const diagnosticCollection = vscode.languages.createDiagnosticCollection('gaql');
      const validator = new GAQLValidator(diagnosticCollection);

      const documentText = `
        // @gaql
        const query = \`
          SELECT
            campaign.invalid_field_name
          FROM
            campaign
        \`;
      `;

      const document = {
        getText: () => documentText,
        uri: { fsPath: 'test.ts' },
      } as any;

      await validator.validateDocument(document);

      const setCalls = vi.mocked(diagnosticCollection.set).mock.calls;
      const diagnostics = setCalls[setCalls.length - 1][1];

      expect(diagnostics.length).toBeGreaterThan(0);
      const diagnostic = diagnostics[0];

      // Japanese message format: リソース「{0}」には「{1}」というフィールドは存在しません
      expect(diagnostic.message).toBe(
        'リソース「campaign」には「campaign.invalid_field_name」というフィールドは存在しません',
      );
    });
  });
});
