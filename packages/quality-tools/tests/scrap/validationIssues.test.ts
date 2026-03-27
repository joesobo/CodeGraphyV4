import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { validateScrapFile } from '../../src/scrap/validationIssues';

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

describe('validateScrapFile', () => {
  it('reports parse diagnostics for malformed files', () => {
    const issues = validateScrapFile(parse(`
      test('broken', () => {
        expect(true).toBe(true);
    `));

    expect(issues.some((issue) => issue.kind === 'parse')).toBe(true);
  });

  it('reports nested test and hook usage inside examples', () => {
    const issues = validateScrapFile(parse(`
      test('outer', () => {
        beforeEach(() => {});
        test('inner', () => {});
      });
    `));

    expect(issues).toEqual([
      {
        kind: 'hook-in-test',
        line: 3,
        message: 'beforeEach call inside a test body should be lifted out of the example.'
      },
      {
        kind: 'nested-test',
        line: 4,
        message: 'Nested test call inside another test body.'
      }
    ]);
  });
});
