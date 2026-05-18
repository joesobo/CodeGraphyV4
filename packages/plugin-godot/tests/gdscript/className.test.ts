import { describe, expect, it } from 'vitest';
import {
  detectClassNameDeclaration,
  extractGDScriptClassNameDeclarations,
} from '../../src/gdscript/className';

describe('detectClassNameDeclaration', () => {
  it('detects class_name declarations with spacing variants', () => {
    expect(detectClassNameDeclaration('class_name Player', 1)).toMatchObject({
      resPath: 'Player',
      referenceType: 'class_name',
      importType: 'static',
      line: 1,
      isDeclaration: true,
    });
    expect(detectClassNameDeclaration('  class_name Enemy', 5)).toMatchObject({
      resPath: 'Enemy',
      line: 5,
    });
    expect(detectClassNameDeclaration('class_name   Npc', 6)).toMatchObject({
      resPath: 'Npc',
      line: 6,
    });
    expect(detectClassNameDeclaration('class_name\tBoss', 7)).toMatchObject({
      resPath: 'Boss',
      line: 7,
    });
  });

  it('ignores comments and non-declaration occurrences', () => {
    expect(detectClassNameDeclaration('# class_name Commented', 1)).toBeNull();
    expect(detectClassNameDeclaration('var class_name Player', 1)).toBeNull();
    expect(detectClassNameDeclaration('const label = "class_name Player"', 1)).toBeNull();
    expect(detectClassNameDeclaration('', 1)).toBeNull();
  });
});

describe('extractGDScriptClassNameDeclarations', () => {
  it('extracts class_name declarations through the GDScript parser package', () => {
    expect(extractGDScriptClassNameDeclarations([
      '@icon("res://icon.svg")',
      '  class_name Player # exported class',
      'extends Node2D',
    ].join('\n'))).toEqual([
      {
        resPath: 'Player',
        referenceType: 'class_name',
        importType: 'static',
        line: 2,
        isDeclaration: true,
      },
    ]);
  });

  it('ignores parser-recovered class_name-like statements that are not declarations', () => {
    expect(extractGDScriptClassNameDeclarations('var class_name AlsoIgnored')).toEqual([]);
    expect(extractGDScriptClassNameDeclarations('class_name')).toEqual([]);
  });
});
