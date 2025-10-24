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
export function getApiVersion(): '19' | '20' | '21' {
  return getConfigValue<'19' | '20' | '21'>('apiVersion', '21');
}

/**
 * Get language setting
 */
export function getLanguage(): string {
  return getConfigValue('language', 'auto');
}
