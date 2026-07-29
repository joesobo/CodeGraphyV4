import type { CliCommand } from './protocol';

const WORKSPACE_SETTING_KEYS = new Set([
  'maxFiles',
  'include',
  'respectGitignore',
  'filterPatterns',
  'disabledCustomFilterPatterns',
  'nodeVisibility',
  'edgeVisibility',
  'plugins',
  'interfaces',
  'pluginData',
]);

function parseError(message: string): CliCommand {
  return { name: 'settings', settings: { action: 'list' }, parseError: message };
}

function readOperands(argv: string[]): string[] {
  const terminator = argv.indexOf('--');
  return terminator < 0 ? argv : [...argv.slice(0, terminator), ...argv.slice(terminator + 1)];
}

function validateKey(key: string | undefined): CliCommand | undefined {
  if (!key) return parseError('settings command requires a workspace setting key');
  return WORKSPACE_SETTING_KEYS.has(key)
    ? undefined
    : parseError(`Unknown workspace setting: ${key}`);
}

function parseReadMutation(
  action: 'get' | 'unset',
  key: string | undefined,
  value: string | undefined,
  extra: string | undefined,
): CliCommand {
  const invalidKey = validateKey(key);
  if (invalidKey) return invalidKey;
  return extra || value
    ? parseError(`Unexpected argument for settings ${action}: ${value ?? extra}`)
    : { name: 'settings', settings: { action, key: key! } };
}

function parseSetMutation(
  key: string | undefined,
  value: string | undefined,
  extra: string | undefined,
): CliCommand {
  const invalidKey = validateKey(key);
  if (invalidKey) return invalidKey;
  if (value === undefined) return parseError('settings set requires a JSON value');
  if (extra) return parseError(`Unexpected argument for settings set: ${extra}`);
  try {
    return {
      name: 'settings',
      settings: { action: 'set', key: key!, value: JSON.parse(value) as unknown },
    };
  } catch {
    return parseError(`settings set value must be valid JSON: ${value}`);
  }
}

export function parseSettingsCommand(argv: string[]): CliCommand {
  const [action, key, value, extra] = readOperands(argv);
  if (!action) return { name: 'settings', settings: { action: 'list' } };
  if (action === 'get' || action === 'unset') {
    return parseReadMutation(action, key, value, extra);
  }
  return action === 'set'
    ? parseSetMutation(key, value, extra)
    : parseError(`Unknown settings action: ${action}`);
}
