import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { computeComplexity } from '../../src/crap/computeComplexity';

function parseFunction(source: string): ts.ArrowFunction {
  const sourceFile = ts.createSourceFile(
    'example.ts',
    `const fn = ${source};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  const statement = sourceFile.statements[0] as ts.VariableStatement;
  const declaration = statement.declarationList.declarations[0];
  return declaration.initializer as ts.ArrowFunction;
}

describe('computeComplexity', () => {
  it('counts the base complexity for straight-line functions', () => {
    expect(computeComplexity(parseFunction('() => 1'))).toBe(1);
  });

  it('counts conditionals, loops, and logical branches', () => {
    const fn = parseFunction(`() => {
      if (true && false) return 1;
      for (const value of [1, 2]) {
        if (value > 1 || value === 0) return value;
      }
      return 0;
    }`);

    expect(computeComplexity(fn)).toBe(6);
  });
});
