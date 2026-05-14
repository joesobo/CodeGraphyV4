import { describe, expect, it } from 'vitest';
import { extractGDScriptLoadReferences } from '../../src/gdscript/resourceLoads';
import type { GDScriptStatement } from '../../src/gdscript/types';

function statement(code: string): GDScriptStatement {
  return {
    line: 4,
    raw: code,
    code,
    trimmed: code.trim(),
  };
}

describe('extractGDScriptLoadReferences', () => {
  it('extracts preload and load resource calls', () => {
    expect(extractGDScriptLoadReferences(statement([
      'preload ("res://scenes/main.tscn")',
      'load( "res://resources/data.tres" )',
      'ResourceLoader.load("user://save.tres")',
    ].join('\n')))).toEqual([
      {
        line: 4,
        referenceType: 'preload',
        resPath: 'res://scenes/main.tscn',
        importType: 'static',
      },
      {
        line: 4,
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

  it('rejects malformed call syntax and non-resource values', () => {
    expect(extractGDScriptLoadReferences(statement([
      'preloadx("res://bad.tscn")',
      'preload(token"res://bad.tscn")',
      'preload("res://bad.tscn"suffix)',
      'loading("res://bad.tres")',
      'load(token"res://bad.tres")',
      'load("res://bad.tres"suffix)',
      'load("./relative.tres")',
    ].join('\n')))).toEqual([]);
  });
});
