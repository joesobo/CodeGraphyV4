import { describe, expect, it } from 'vitest';
import {
  parseGodotProjectSection,
  parseGodotProjectSetting,
} from '../../src/textResource/projectSettingsLine';

describe('parseGodotProjectSection', () => {
  it('parses trimmed section names', () => {
    expect(parseGodotProjectSection('[ application ]')).toBe('application');
  });

  it('rejects non-leading or trailing section text', () => {
    expect(parseGodotProjectSection('prefix [application]')).toBeNull();
    expect(parseGodotProjectSection('[application] trailing')).toBeNull();
    expect(parseGodotProjectSection('[bad]name]')).toBeNull();
  });
});

describe('parseGodotProjectSetting', () => {
  it('parses settings with trimmed keys and values', () => {
    expect(parseGodotProjectSetting(' config/name = "Demo" ', 8, 'application')).toEqual({
      line: 8,
      section: 'application',
      key: 'config/name',
      value: '"Demo"',
    });
  });

  it('rejects lines without a complete key/value pair', () => {
    expect(parseGodotProjectSetting('missing separator', 1, null)).toBeNull();
    expect(parseGodotProjectSetting('=value', 1, null)).toBeNull();
    expect(parseGodotProjectSetting('key=', 1, null)).toBeNull();
  });
});
