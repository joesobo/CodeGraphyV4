import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { structureIssues } from '../../../src/scrap/policy/structureIssues';

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

describe('structureIssues', () => {
  it('returns no issues for top-level suite structure', () => {
    expect(structureIssues(parse(`
      describe('suite', () => {
        beforeEach(() => {});
        test('ok', () => {
          expect(true).toBe(true);
        });
      });
    `))).toEqual([]);
  });

  it('reports nested tests and misplaced hooks or suite builders inside examples', () => {
    expect(structureIssues(parse(`
      test('outer', () => {
        beforeEach(() => {});
        context('nested context', () => {});
        test('inner', () => {});
      });
    `))).toEqual([
      {
        kind: 'hook-in-test',
        line: 3,
        message: 'beforeEach call inside a test body should be lifted out of the example.'
      },
      {
        kind: 'hook-in-test',
        line: 4,
        message: 'context call inside a test body should be lifted out of the example.'
      },
      {
        kind: 'nested-test',
        line: 5,
        message: 'Nested test call inside another test body.'
      }
    ]);
  });

  it('ignores ordinary context helpers and variables inside examples', () => {
    expect(structureIssues(parse(`
      test('uses a provider context object', () => {
        const context = createContext();
        context.load();
        expect(context.ready).toBe(true);
      });
    `))).toEqual([]);
  });
});
