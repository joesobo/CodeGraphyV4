import { describe, expect, it } from 'vitest';
import { parseGodotTagFields } from '../../src/textResource/tagFields';

describe('parseGodotTagFields', () => {
  it('parses double-quoted, single-quoted, and bare fields', () => {
    expect(parseGodotTagFields(' type="Script" uid=\'uid://script\' load_steps=3'))
      .toEqual({
        type: 'Script',
        uid: 'uid://script',
        load_steps: '3',
      });
  });

  it('keeps escaped quote content inside quoted fields', () => {
    expect(parseGodotTagFields(' title="A \\"quoted\\" scene"'))
      .toEqual({
        title: 'A \\"quoted\\" scene',
      });
  });

  it('ignores malformed fields', () => {
    expect(parseGodotTagFields(' 3bad="ignored" missing= two words')).toEqual({});
  });
});
