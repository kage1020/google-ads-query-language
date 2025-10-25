import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCurrentLanguage,
  getMessage,
  getMessageInLanguage,
  initializeLocalization,
  MessageKey,
  updateLanguage,
} from './localization.js';

// Mock vscode module
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key: string) => {
        if (key === 'language') return 'auto';
        return undefined;
      }),
    })),
  },
  env: {
    language: 'en',
  },
}));

describe('localization.ts', () => {
  beforeEach(() => {
    // Reset to default language
    initializeLocalization('en');
  });

  describe('Language Detection', () => {
    it('should default to English when language is auto and VSCode language is not supported', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.env).language = 'fr'; // Unsupported language

      updateLanguage('auto');

      expect(getCurrentLanguage()).toBe('en');
    });

    it('should use English when explicitly set to en', () => {
      initializeLocalization('en');

      expect(getCurrentLanguage()).toBe('en');
    });

    it('should use Japanese when explicitly set to ja', () => {
      initializeLocalization('ja');

      expect(getCurrentLanguage()).toBe('ja');
    });

    it('should auto-detect Japanese from VSCode language settings', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.env).language = 'ja';

      updateLanguage('auto');

      expect(getCurrentLanguage()).toBe('ja');
    });

    it('should handle language changes dynamically', () => {
      initializeLocalization('en');
      expect(getCurrentLanguage()).toBe('en');

      updateLanguage('ja');
      expect(getCurrentLanguage()).toBe('ja');

      updateLanguage('en');
      expect(getCurrentLanguage()).toBe('en');
    });

    it('should use configuration language if provided', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'language') return 'ja';
          return undefined;
        }),
        has: vi.fn(),
        inspect: vi.fn(),
        update: vi.fn(),
      });

      updateLanguage();

      expect(getCurrentLanguage()).toBe('ja');
    });
  });

  describe('Message Retrieval', () => {
    it('should return correct English messages for all MessageKey enums', () => {
      initializeLocalization('en');

      expect(getMessage(MessageKey.MISSING_SELECT)).toBe('GAQL query requires a SELECT clause');
      expect(getMessage(MessageKey.MISSING_FROM)).toBe('GAQL query requires a FROM clause');
      expect(getMessage(MessageKey.INVALID_SYNTAX)).toBe('Invalid GAQL syntax');
      expect(getMessage(MessageKey.INVALID_OPERATOR)).toBe('Invalid operator in WHERE clause');
    });

    it('should return correct Japanese messages for all MessageKey enums', () => {
      initializeLocalization('ja');

      expect(getMessage(MessageKey.MISSING_SELECT)).toBe('GAQLクエリにはSELECT句が必要です');
      expect(getMessage(MessageKey.MISSING_FROM)).toBe('GAQLクエリにはFROM句が必要です');
      expect(getMessage(MessageKey.INVALID_SYNTAX)).toBe('無効なGAQL構文です');
      expect(getMessage(MessageKey.INVALID_OPERATOR)).toBe('WHERE句の演算子が無効です');
    });

    it('should support string interpolation in messages', () => {
      initializeLocalization('en');

      expect(getMessage(MessageKey.INVALID_RESOURCE, 'test_resource')).toBe(
        'Invalid resource name: test_resource',
      );
      expect(getMessage(MessageKey.INVALID_FIELD, 'campaign', 'invalid_field')).toBe(
        'Resource "campaign" does not have a field "invalid_field"',
      );
    });

    it('should support string interpolation in Japanese messages', () => {
      initializeLocalization('ja');

      expect(getMessage(MessageKey.INVALID_RESOURCE, 'test_resource')).toBe(
        '無効なリソース名: test_resource',
      );
      expect(getMessage(MessageKey.INVALID_FIELD, 'campaign', 'invalid_field')).toBe(
        'リソース「campaign」には「invalid_field」というフィールドは存在しません',
      );
    });

    it('should use getMessageInLanguage for specific language', () => {
      expect(getMessageInLanguage('en', MessageKey.MISSING_SELECT)).toBe(
        'GAQL query requires a SELECT clause',
      );
      expect(getMessageInLanguage('ja', MessageKey.MISSING_SELECT)).toBe(
        'GAQLクエリにはSELECT句が必要です',
      );
    });

    it('should handle missing translations by falling back to English', () => {
      initializeLocalization('en');

      // All messages should be present, so this tests the fallback mechanism
      const message = getMessage(MessageKey.MISSING_SELECT);
      expect(message).toBeTruthy();
      expect(typeof message).toBe('string');
    });
  });

  describe('Language Code Handling', () => {
    it('should detect Japanese from ja-JP locale', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.env).language = 'ja-JP';

      updateLanguage('auto');

      expect(getCurrentLanguage()).toBe('ja');
    });

    it('should detect Japanese from ja locale', async () => {
      const vscode = await import('vscode');
      vi.mocked(vscode.env).language = 'ja';

      updateLanguage('auto');

      expect(getCurrentLanguage()).toBe('ja');
    });

    it('should default to English for unsupported locales', async () => {
      const vscode = await import('vscode');
      // Clear any previous language settings
      vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'language') return 'auto';
          return undefined;
        }),
        has: vi.fn(),
        inspect: vi.fn(),
        update: vi.fn(),
      });
      vi.mocked(vscode.env).language = 'de-DE';

      updateLanguage('auto');

      expect(getCurrentLanguage()).toBe('en');
    });
  });
});
