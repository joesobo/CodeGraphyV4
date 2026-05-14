import { describe, expect, it } from 'vitest';
import { parseGDScriptDocument } from '../../src/gdscript/document';

describe('parseGDScriptDocument', () => {
  it('preserves line numbers while stripping comments outside quoted strings', () => {
    const document = parseGDScriptDocument([
      '# full comment',
      'const Scene = preload("res://scenes/menu#v2.tscn") # inline comment',
      '',
      'var x = 1',
    ].join('\n'));

    expect(document.statements).toEqual([
      {
        line: 2,
        raw: 'const Scene = preload("res://scenes/menu#v2.tscn") # inline comment',
        code: 'const Scene = preload("res://scenes/menu#v2.tscn")',
        trimmed: 'const Scene = preload("res://scenes/menu#v2.tscn")',
      },
      {
        line: 4,
        raw: 'var x = 1',
        code: 'var x = 1',
        trimmed: 'var x = 1',
      },
    ]);
  });
});
