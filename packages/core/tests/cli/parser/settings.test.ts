import { describe, expect, it } from 'vitest';
import { parseSettingsCommand } from '../../../src/cli/parser/settings';

describe('cli/parser/settings', () => {
  it('parses reads and JSON mutations', () => {
    expect(parseSettingsCommand([])).toEqual({
      name: 'settings', settings: { action: 'list' },
    });
    expect(parseSettingsCommand(['get', 'maxFiles'])).toMatchObject({
      name: 'settings', settings: { action: 'get', key: 'maxFiles' },
    });
    expect(parseSettingsCommand(['set', 'include', '["src/**/*.ts"]'])).toMatchObject({
      name: 'settings', settings: { action: 'set', key: 'include', value: ['src/**/*.ts'] },
    });
    expect(parseSettingsCommand(['unset', 'maxFiles'])).toMatchObject({
      name: 'settings', settings: { action: 'unset', key: 'maxFiles' },
    });
  });

  it('rejects incomplete, unknown, malformed, and extra operands', () => {
    expect(parseSettingsCommand(['unknown'])).toMatchObject({
      parseError: 'Unknown settings action: unknown',
    });
    expect(parseSettingsCommand(['get'])).toMatchObject({
      parseError: 'settings command requires a workspace setting key',
    });
    expect(parseSettingsCommand(['get', 'maxFiles', 'extra'])).toMatchObject({
      parseError: 'Unexpected argument for settings get: extra',
    });
    expect(parseSettingsCommand(['set', 'unknown', '1'])).toMatchObject({
      parseError: 'Unknown workspace setting: unknown',
    });
    expect(parseSettingsCommand(['set', 'maxFiles'])).toMatchObject({
      parseError: 'settings set requires a JSON value',
    });
    expect(parseSettingsCommand(['set', 'maxFiles', '1', 'extra'])).toMatchObject({
      parseError: 'Unexpected argument for settings set: extra',
    });
    expect(parseSettingsCommand(['set', 'maxFiles', 'many'])).toMatchObject({
      parseError: 'settings set value must be valid JSON: many',
    });
  });
});
