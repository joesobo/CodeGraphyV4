import { hasSupportedRawPluginIdentity } from './settingsPlugins';

type ValidationResult = string | undefined;
type ValueValidator = (value: unknown) => ValidationResult;

interface FieldRule {
  error: string;
  key: string;
  accepts(value: unknown): boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(entry => typeof entry === 'string');
}

function isBooleanRecord(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every(entry => typeof entry === 'boolean');
}

const PLUGIN_FIELD_RULES: readonly FieldRule[] = [
  { key: 'id', accepts: value => typeof value === 'string', error: 'plugin id must be a string' },
  { key: 'package', accepts: value => typeof value === 'string', error: 'plugin package must be a string' },
  {
    key: 'activation',
    accepts: value => value === 'inherit' || value === 'enabled' || value === 'disabled',
    error: 'plugin activation must be inherit, enabled, or disabled',
  },
  { key: 'enabled', accepts: value => typeof value === 'boolean', error: 'plugin enabled must be a boolean' },
  { key: 'options', accepts: isRecord, error: 'plugin options must be an object' },
  {
    key: 'disabledFilterPatterns',
    accepts: isStringArray,
    error: 'plugin disabledFilterPatterns must be an array of strings',
  },
];

function validatePluginEntry(value: unknown): ValidationResult {
  if (!isRecord(value)) return 'plugins entries must be objects';
  for (const rule of PLUGIN_FIELD_RULES) {
    if (rule.key in value && !rule.accepts(value[rule.key])) return rule.error;
  }
  return hasSupportedRawPluginIdentity(value)
    ? undefined
    : 'plugin entry must have a nonblank id with activation, or a nonblank package';
}

function validatePluginSettings(value: unknown): ValidationResult {
  if (!Array.isArray(value)) return 'plugins must be an array';
  for (const entry of value) {
    const error = validatePluginEntry(entry);
    if (error) return error;
  }
  return undefined;
}

function isInterfaceEntry(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' && Boolean(value.id.trim()) && 'data' in value;
}

function validateInterfaceSettings(value: unknown): ValidationResult {
  if (!Array.isArray(value)) return 'interfaces must be an array';
  return value.every(isInterfaceEntry)
    ? undefined
    : 'interface entries must have a nonblank id and data';
}

function requireStringArray(key: string): ValueValidator {
  return value => isStringArray(value) ? undefined : `${key} must be an array of strings`;
}

const WORKSPACE_SETTING_VALIDATORS: Readonly<Record<string, ValueValidator>> = {
  version: value => value === 1 ? undefined : 'version must be 1',
  include: requireStringArray('include'),
  filterPatterns: requireStringArray('filterPatterns'),
  disabledCustomFilterPatterns: requireStringArray('disabledCustomFilterPatterns'),
  respectGitignore: value => typeof value === 'boolean' ? undefined : 'respectGitignore must be a boolean',
  maxFiles: value => (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 1
      ? undefined
      : 'maxFiles must be a positive integer'
  ),
  nodeVisibility: value => isBooleanRecord(value) ? undefined : 'nodeVisibility must be an object of boolean values',
  edgeVisibility: value => isBooleanRecord(value) ? undefined : 'edgeVisibility must be an object of boolean values',
  pluginData: value => isRecord(value) ? undefined : 'pluginData must be an object',
  plugins: validatePluginSettings,
  interfaces: validateInterfaceSettings,
};

export function validateWorkspaceSettingsRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('workspace settings must be a JSON object');
  for (const [key, validate] of Object.entries(WORKSPACE_SETTING_VALIDATORS)) {
    if (!(key in value)) continue;
    const error = validate(value[key]);
    if (error) throw new Error(error);
  }
  return { ...value };
}
