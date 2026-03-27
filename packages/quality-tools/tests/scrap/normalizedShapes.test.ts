import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  literalShapeFingerprint,
  statementFeatures,
  statementFingerprint
} from '../../src/scrap/normalizedShapes';

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
    expect(features).toEqual([...features].sort());
  });

  it('preserves identifier structure while normalizing literal differences in literal-shape fingerprints', () => {
    const left = literalShapeFingerprint(parseStatements(`
      expect(renderNode('alpha')).toEqual('one');
    `));
    const right = literalShapeFingerprint(parseStatements(`
      expect(renderNode('beta')).toEqual('two');
    `));
    const differentSubject = literalShapeFingerprint(parseStatements(`
      expect(renderGraph('beta')).toEqual('two');
    `));

    expect(left).toBe(right);
    expect(left).not.toBe(differentSubject);
  });

  it('distinguishes normalized literals from identifier leaves in statement fingerprints', () => {
    const numericLiteral = statementFingerprint(parseStatements(`
      expect(result).toBe(1);
    `));
    const stringLiteral = statementFingerprint(parseStatements(`
      expect(result).toBe('alpha');
    `));
    const identifier = statementFingerprint(parseStatements(`
      expect(result).toBe(expectedValue);
    `));

    expect(numericLiteral).toContain('lit');
    expect(stringLiteral).toContain('lit');
    expect(numericLiteral).not.toBe(identifier);
    expect(stringLiteral).not.toBe(identifier);
  });
});
