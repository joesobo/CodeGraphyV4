import { describe, expect, it } from 'vitest';
import { parseSettingsCommand } from '../../src/cli/parseSettings';

describe('cli/parseSettings', () => {
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

  it('rejects unknown keys and malformed JSON values', () => {
    expect(parseSettingsCommand(['set', 'unknown', '1'])).toMatchObject({
      parseError: 'Unknown workspace setting: unknown',
    });
    expect(parseSettingsCommand(['set', 'maxFiles', 'many'])).toMatchObject({
      parseError: 'settings set value must be valid JSON: many',
    });
  });
});
