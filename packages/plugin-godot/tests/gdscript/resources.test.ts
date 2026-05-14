import { describe, expect, it } from 'vitest';
import { parseGDScriptResourceReferences } from '../../src/gdscript/resources';

describe('parseGDScriptResourceReferences', () => {
  it('parses load-like and inheritance references from structured statements', () => {
    const references = parseGDScriptResourceReferences([
      'extends "res://scripts/base.gd"',
      'const Scene = preload("res://scenes/main.tscn")',
      'var data = load("res://resources/data.tres")',
      'var runtime = ResourceLoader.load("user://save.tres")',
      '# preload("res://ignored.tscn")',
    ].join('\n'));

    expect(references).toEqual([
      {
        line: 1,
        referenceType: 'extends',
        resPath: 'res://scripts/base.gd',
        importType: 'static',
      },
      {
        line: 2,
        referenceType: 'preload',
        resPath: 'res://scenes/main.tscn',
        importType: 'static',
      },
      {
        line: 3,
        referenceType: 'load',
        resPath: 'res://resources/data.tres',
        importType: 'dynamic',
      },
      {
        line: 4,
        referenceType: 'load',
        resPath: 'user://save.tres',
        importType: 'dynamic',
      },
    ]);
  });

  it('ignores non-resource paths in recognized calls', () => {
    expect(parseGDScriptResourceReferences([
      'extends BaseClass',
      'const Scene = preload("http://example.com/main.tscn")',
      'var data = load("./relative.tres")',
    ].join('\n'))).toEqual([]);
  });
});
