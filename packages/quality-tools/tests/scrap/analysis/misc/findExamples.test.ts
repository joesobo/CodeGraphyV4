import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { findExamples } from '../../../../src/scrap/analysis/find';

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

describe('findExamples', () => {
  it('finds nested examples and preserves describe depth', () => {
    const examples = findExamples(parse(`
      describe('outer', () => {
        context('inner', () => {
          test.only('works', () => {});
        });
      });
    `));

    expect(examples).toHaveLength(1);
    expect(examples[0]).toMatchObject({
      blockPath: ['outer', 'inner'],
      describeDepth: 2,
      name: 'works'
    });
  });

  it('uses anonymous names for non-string labels and ignores describe blocks', () => {
    const examples = findExamples(parse(`
      describe(label, () => {
        it(label, () => {});
      });
    `));

    expect(examples).toHaveLength(1);
    expect(examples[0]?.name).toBe('(anonymous)');
    expect(examples[0]?.blockPath).toEqual(['(anonymous)']);
  });

  it('ignores callback-based calls that are not test examples', () => {
    const examples = findExamples(parse(`
      helper('setup', () => {});

      describe('suite', () => {
        custom('not a test', () => {});
        it('real test', () => {});
      });
    `));

    expect(examples).toHaveLength(1);
    expect(examples[0]).toMatchObject({ blockPath: ['suite'], name: 'real test' });
  });

  it('marks table-driven examples discovered through test.each', () => {
    const examples = findExamples(parse(`
      describe('suite', () => {
        test.each([[1]])('real test', () => {});
      });
    `));

    expect(examples).toHaveLength(1);
    expect(examples[0]).toMatchObject({
      blockPath: ['suite'],
      name: 'real test',
      tableDriven: true
    });
  });
});
