import { defaultApiVersion, type SupportedApiVersion } from '@gaql/core';
import * as vscode from 'vscode';

/**
 * Get configuration value
 * @param key Configuration key (without prefix)
 * @param defaultValue Default value if not set
 * @returns Configuration value
 */
function getConfigValue<T>(key: string, defaultValue: T): T {
  const config = vscode.workspace.getConfiguration('gaql');
  return config.get<T>(key, defaultValue);
}

/**
 * Get whether GAQL validation is enabled
 */
export function getEnabled(): boolean {
  return getConfigValue('enabled', true);
}

/**
 * Get activation mode
 */
export function getActivationMode(): 'always' | 'onDemand' {
  return getConfigValue<'always' | 'onDemand'>('activationMode', 'onDemand');
}

/**
 * Get API version
 */
export function getApiVersion(): SupportedApiVersion {
  return getConfigValue<SupportedApiVersion>('apiVersion', defaultApiVersion);
}

/**
 * Get language setting
 */
export function getLanguage(): string {
  return getConfigValue('language', 'auto');
}
