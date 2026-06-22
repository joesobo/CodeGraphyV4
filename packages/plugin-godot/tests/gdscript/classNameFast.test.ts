import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/gdscript/syntaxTree', () => ({
  findGDScriptSyntaxNodes: vi.fn(),
  parseGDScriptSyntaxTree: vi.fn(() => {
    throw new Error('syntax parser should not run for class_name extraction');
  }),
  readFirstDescendantText: vi.fn(),
  readGDScriptLineNumber: vi.fn(),
}));

import { extractGDScriptClassNameDeclarations } from '../../src/gdscript/className';

describe('fast GDScript class_name extraction', () => {
  it('extracts declarations without the syntax parser', () => {
    expect(extractGDScriptClassNameDeclarations([
      '@icon("res://icon.svg")',
      'class_name Player # exported class',
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
});
