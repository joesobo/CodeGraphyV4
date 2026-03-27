import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { statementFeatures } from '../../src/scrap/normalizedShapes';

function parseStatements(source: string): ts.Statement[] {
  const sourceFile = ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return [...sourceFile.statements];
}

describe('statementFeatures', () => {
  it('normalizes identifier and literal differences while preserving shape', () => {
    const left = statementFeatures(parseStatements(`
      const first = buildNode(1, 'alpha');
      expect(first).toEqual({ depth: 1 });
    `));
    const right = statementFeatures(parseStatements(`
      const second = buildNode(2, 'beta');
      expect(second).toEqual({ depth: 9 });
    `));

    expect(left).toEqual(right);
    expect(left.length).toBeGreaterThan(5);
  });

  it('captures collection structure changes in the feature set', () => {
    const features = statementFeatures(parseStatements(`
      const output = parser.parse([items[0]]);
      expect(output.values).toContainEqual({ name: 'alpha', enabled: true });
    `));
    const withoutCollections = statementFeatures(parseStatements(`
      const output = parser.parse(items[0]);
      expect(output.values).toContainEqual(name);
    `));

    expect(features.length).toBeGreaterThan(withoutCollections.length);
    expect(features).not.toEqual(withoutCollections);
  });
});
