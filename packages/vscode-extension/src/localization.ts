import * as vscode from 'vscode';
import { getLanguage } from './config.js';

/**
 * Supported languages list
 */
export const supportedLanguages = ['en', 'ja'] as const;

/**
 * Supported languages
 */
export type Language = (typeof supportedLanguages)[number];

/**
 * Message keys for localization
 */
export enum MessageKey {
  MISSING_SELECT = 'validation.missingSelect',
  MISSING_FROM = 'validation.missingFrom',
  INVALID_RESOURCE = 'validation.invalidResource',
  INVALID_FIELD = 'validation.invalidField',
  INVALID_SYNTAX = 'validation.invalidSyntax',
  INVALID_OPERATOR = 'validation.invalidOperator',
  CODE_ACTION_DISABLE_LINE = 'codeAction.disableLine',
  CODE_ACTION_DISABLE_FILE = 'codeAction.disableFile',
}

/**
 * Localized messages
 */
const messages: Record<Language, Record<MessageKey, string>> = {
  en: {
    [MessageKey.MISSING_SELECT]: 'GAQL query requires a SELECT clause',
    [MessageKey.MISSING_FROM]: 'GAQL query requires a FROM clause',
    [MessageKey.INVALID_RESOURCE]: 'Invalid resource name: {0}',
    [MessageKey.INVALID_FIELD]: 'Resource "{0}" does not have a field "{1}"',
    [MessageKey.INVALID_SYNTAX]: 'Invalid GAQL syntax',
    [MessageKey.INVALID_OPERATOR]: 'Invalid operator in WHERE clause',
    [MessageKey.CODE_ACTION_DISABLE_LINE]: 'Disable GAQL validation for this line',
    [MessageKey.CODE_ACTION_DISABLE_FILE]: 'Disable GAQL validation for entire file',
  },
  ja: {
    [MessageKey.MISSING_SELECT]: 'GAQLクエリにはSELECT句が必要です',
    [MessageKey.MISSING_FROM]: 'GAQLクエリにはFROM句が必要です',
    [MessageKey.INVALID_RESOURCE]: '無効なリソース名: {0}',
    [MessageKey.INVALID_FIELD]: 'リソース「{0}」には「{1}」というフィールドは存在しません',
    [MessageKey.INVALID_SYNTAX]: '無効なGAQL構文です',
    [MessageKey.INVALID_OPERATOR]: 'WHERE句の演算子が無効です',
    [MessageKey.CODE_ACTION_DISABLE_LINE]: 'この行のGAQLバリデーションを無効化',
    [MessageKey.CODE_ACTION_DISABLE_FILE]: 'ファイル全体のGAQLバリデーションを無効化',
  },
};

/**
 * Current language setting
 */
let currentLanguage: Language = supportedLanguages[0];

/**
 * Initialize localization based on VS Code settings
 * @param language Language code or 'auto' for automatic detection
 */
export function initializeLocalization(language?: string): void {
  updateLanguage(language);
}

/**
 * Update language based on VS Code configuration and locale
 * @param language Language code or 'auto' for automatic detection
 */
export function updateLanguage(language?: string): void {
  // If language is explicitly provided and is supported, use it
  if (language && language !== 'auto' && supportedLanguages.includes(language as Language)) {
    currentLanguage = language as Language;
    return;
  }

  // Get language from configuration (supports both old and new config names)
  const configLanguage = getLanguage();

  if (
    configLanguage &&
    configLanguage !== 'auto' &&
    supportedLanguages.includes(configLanguage as Language)
  ) {
    currentLanguage = configLanguage as Language;
    return;
  }

  // If configuration is set to 'auto' or not set, use VS Code's display language
  const vscodeLanguage = vscode.env.language;

  // Map VS Code language codes to supported languages
  if (vscodeLanguage.startsWith('ja')) {
    currentLanguage = 'ja';
  } else {
    currentLanguage = 'en';
  }
}

/**
 * Get current language
 */
export function getCurrentLanguage(): Language {
  return currentLanguage;
}

/**
 * Get localized message
 * @param key Message key
 * @param args Arguments to replace placeholders ({0}, {1}, etc.)
 */
export function getMessage(key: MessageKey, ...args: string[]): string {
  let message = messages[currentLanguage][key] || messages.en[key] || key;

  // Replace placeholders
  args.forEach((arg, index) => {
    message = message.replace(`{${index}}`, arg);
  });

  return message;
}

/**
 * Get message in specific language (for testing)
 */
export function getMessageInLanguage(
  language: Language,
  key: MessageKey,
  ...args: string[]
): string {
  let message = messages[language][key] || messages.en[key] || key;

  // Replace placeholders
  args.forEach((arg, index) => {
    message = message.replace(`{${index}}`, arg);
  });

  return message;
}
