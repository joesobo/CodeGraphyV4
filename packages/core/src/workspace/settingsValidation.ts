import { hasSupportedRawPluginIdentity } from './settingsPlugins';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(entry => typeof entry === 'string');
}

function isBooleanRecord(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every(entry => typeof entry === 'boolean');
}

function validatePluginSettings(value: unknown): string | undefined {
  if (!Array.isArray(value)) return 'plugins must be an array';
  for (const entry of value) {
    if (!isRecord(entry)) return 'plugins entries must be objects';
    if ('id' in entry && typeof entry.id !== 'string') return 'plugin id must be a string';
    if ('package' in entry && typeof entry.package !== 'string') return 'plugin package must be a string';
    if ('activation' in entry && !['inherit', 'enabled', 'disabled'].includes(String(entry.activation))) {
      return 'plugin activation must be inherit, enabled, or disabled';
    }
    if ('enabled' in entry && typeof entry.enabled !== 'boolean') return 'plugin enabled must be a boolean';
    if ('options' in entry && !isRecord(entry.options)) return 'plugin options must be an object';
    if ('disabledFilterPatterns' in entry && !isStringArray(entry.disabledFilterPatterns)) {
      return 'plugin disabledFilterPatterns must be an array of strings';
    }
    if (!hasSupportedRawPluginIdentity(entry)) {
      return 'plugin entry must have a nonblank id with activation, or a nonblank package';
    }
  }
  return undefined;
}

function validateInterfaceSettings(value: unknown): string | undefined {
  if (!Array.isArray(value)) return 'interfaces must be an array';
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || !entry.id.trim() || !('data' in entry)) {
      return 'interface entries must have a nonblank id and data';
    }
  }
  return undefined;
}

export function validateWorkspaceSettingsRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('workspace settings must be a JSON object');
  const stringArrays = ['include', 'filterPatterns', 'disabledCustomFilterPatterns'] as const;
  for (const key of stringArrays) {
    if (key in value && !isStringArray(value[key])) throw new Error(`${key} must be an array of strings`);
  }
  if ('respectGitignore' in value && typeof value.respectGitignore !== 'boolean') {
    throw new Error('respectGitignore must be a boolean');
  }
  if ('maxFiles' in value && (
    typeof value.maxFiles !== 'number'
    || !Number.isSafeInteger(value.maxFiles)
    || value.maxFiles < 1
  )) {
    throw new Error('maxFiles must be a positive integer');
  }
  if ('nodeVisibility' in value && !isBooleanRecord(value.nodeVisibility)) {
    throw new Error('nodeVisibility must be an object of boolean values');
  }
  if ('edgeVisibility' in value && !isBooleanRecord(value.edgeVisibility)) {
    throw new Error('edgeVisibility must be an object of boolean values');
  }
  if ('pluginData' in value && !isRecord(value.pluginData)) throw new Error('pluginData must be an object');
  if ('plugins' in value) {
    const error = validatePluginSettings(value.plugins);
    if (error) throw new Error(error);
  }
  if ('interfaces' in value) {
    const error = validateInterfaceSettings(value.interfaces);
    if (error) throw new Error(error);
  }
  return { ...value };
}
