import { describe, expect, it } from 'vitest';
import { extractGDScriptExtendsReference } from '../../src/gdscript/resourceExtends';
import type { GDScriptStatement } from '../../src/gdscript/types';

function statement(trimmed: string): GDScriptStatement {
  return {
    line: 3,
    raw: trimmed,
    code: trimmed,
    trimmed,
  };
}

describe('extractGDScriptExtendsReference', () => {
  it('extracts Godot resource inheritance references', () => {
    expect(extractGDScriptExtendsReference(statement('extends   "res://scripts/base.gd"'))).toEqual({
      resPath: 'res://scripts/base.gd',
      referenceType: 'extends',
      importType: 'static',
      line: 3,
    });
  });

  it('ignores non-leading extends text and non-resource inheritance', () => {
    expect(extractGDScriptExtendsReference(statement('var text = extends "res://scripts/base.gd"'))).toBeNull();
    expect(extractGDScriptExtendsReference(statement('extends"res://scripts/base.gd"'))).toBeNull();
    expect(extractGDScriptExtendsReference(statement('extends BaseClass'))).toBeNull();
  });
});
