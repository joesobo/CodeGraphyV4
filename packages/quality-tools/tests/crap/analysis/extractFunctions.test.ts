import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { extractFunctions } from '../../../src/crap/analysis/extractFunctions';

function parseSource(source: string): ts.SourceFile {
  return ts.createSourceFile(
    'example.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
}

describe('extractFunctions', () => {
  it('extracts names for declarations, methods, accessors, constructors, and variable-like functions', () => {
    const sourceFile = parseSource(`
      export function namedDeclaration() { return 1; }
      const namedArrow = () => 1;
      const objectLiteral = { member: function () { return 1; } };
      class Example {
        constructor() {}
        get value() { return 1; }
        set value(next: number) { void next; }
        method() { return 1; }
        field = () => 1;
      }
    `);

    const names = extractFunctions(sourceFile).map((fn) => fn.name);
    expect(names).toContain('namedDeclaration');
    expect(names).toContain('namedArrow');
    expect(names).toContain('member');
    expect(names).toContain('constructor');
    expect(names).toContain('get value');
    expect(names).toContain('set value');
    expect(names).toContain('method');
    expect(names).toContain('field');
  });

  it('falls back to anonymous when no parent name exists', () => {
    const sourceFile = parseSource(`[1].map(function () { return 1; });`);
    expect(extractFunctions(sourceFile)[0]?.name).toBe('(anonymous)');
  });

  it('records 1-based line numbers for extracted functions', () => {
    const sourceFile = parseSource(
      'export function first() { return 1; }\n' +
      'const second = () => 2;\n'
    );

    expect(extractFunctions(sourceFile)).toEqual([
      expect.objectContaining({ endLine: 1, line: 1, name: 'first' }),
      expect.objectContaining({ endLine: 2, line: 2, name: 'second' })
    ]);
  });
});
