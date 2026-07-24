import { describe, expect, it } from 'vitest';
import { parseSettingsCommand } from '../../src/cli/parseSettings';

describe('cli/parseSettings', () => {
  it('parses reads and JSON mutations', () => {
    expect(parseSettingsCommand([])).toEqual({ name: 'settings' });
    expect(parseSettingsCommand(['get', 'maxFiles'])).toMatchObject({
      name: 'settings', settingsAction: 'get', settingsKey: 'maxFiles',
    });
    expect(parseSettingsCommand(['set', 'include', '["src/**/*.ts"]'])).toMatchObject({
      name: 'settings', settingsAction: 'set', settingsKey: 'include', settingsValue: ['src/**/*.ts'],
    });
    expect(parseSettingsCommand(['unset', 'maxFiles'])).toMatchObject({
      name: 'settings', settingsAction: 'unset', settingsKey: 'maxFiles',
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
