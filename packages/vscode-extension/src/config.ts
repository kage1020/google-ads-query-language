import { defaultApiVersion, type SupportedApiVersion } from '@gaql/core';
import * as vscode from 'vscode';

const configPrefix = 'gaql' as const;
export const configName = {
  prefix: configPrefix,
  apiVersion: 'apiVersion',
  language: 'language',
  enabled: 'enabled',
  activationMode: 'activationMode',
} as const;

/**
 * Get configuration value
 * @param key Configuration key (without prefix)
 * @param defaultValue Default value if not set
 * @returns Configuration value
 */
function getConfigValue<T>(key: string, defaultValue: T): T {
  const config = vscode.workspace.getConfiguration(configPrefix);
  return config.get<T>(key, defaultValue);
}

/**
 * Get whether GAQL validation is enabled
 */
export function getEnabled(): boolean {
  return getConfigValue(configName.enabled, true);
}

/**
 * Get activation mode
 */
export function getActivationMode(): 'always' | 'onDemand' {
  return getConfigValue<'always' | 'onDemand'>(configName.activationMode, 'onDemand');
}

/**
 * Get API version
 */
export function getApiVersion(): SupportedApiVersion {
  return getConfigValue<SupportedApiVersion>(configName.apiVersion, defaultApiVersion);
}

/**
 * Get language setting
 */
export function getLanguage(): string {
  return getConfigValue(configName.language, 'auto');
}
