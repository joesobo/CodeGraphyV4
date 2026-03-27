import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { analyzeHelperUsage } from '../../src/scrap/helperUsage';
import { findExamples } from '../../src/scrap/findExamples';

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

describe('analyzeHelperUsage', () => {
  it('counts direct helper calls and transitive hidden helper lines', () => {
    const sourceFile = parse(`
      describe('suite', () => {
        function trimValue(value: string) {
          return value.trim();
        }

        function buildValue() {
          return trimValue(' value ');
        }

        it('uses helpers', () => {
          expect(buildValue()).toBe('value');
        });
      });
    `);

    const [example] = findExamples(sourceFile);
    expect(analyzeHelperUsage(sourceFile, example!)).toEqual({
      helperCallCount: 1,
      helperHiddenLineCount: 6
    });
  });

  it('ignores helpers declared inside the example body itself', () => {
    const sourceFile = parse(`
      test('inline helper', () => {
        function buildValue() {
          return 'value';
        }

        expect(buildValue()).toBe('value');
      });
    `);

    const [example] = findExamples(sourceFile);
    expect(analyzeHelperUsage(sourceFile, example!)).toEqual({
      helperCallCount: 0,
      helperHiddenLineCount: 0
    });
  });
});
