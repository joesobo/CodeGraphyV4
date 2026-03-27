import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { analyzeExample } from '../../src/scrap/exampleMetrics';
import { findExamples } from '../../src/scrap/findExamples';
import { analyzeFileExamples } from '../../src/scrap/scoredExamples';

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

describe('analyzeFileExamples', () => {
  it('adds duplicate setup group sizes and raises repeated setup scores', () => {
    const sourceFile = parse(`
      describe('suite', () => {
        it('a', () => {
          const value = createValue('a');
          vi.mock('./alpha');
          expect(value).toBeDefined();
        });

        it('b', () => {
          const result = createValue('b');
          vi.mock('./beta');
          expect(result).toBeDefined();
        });

        it('c', () => {
          expect(true).toBe(true);
        });
      });
    `);

    const examples = findExamples(sourceFile);
    const baseScore = analyzeExample(sourceFile, examples[0]!).score;
    const scored = analyzeFileExamples(sourceFile);

    expect(scored.map((example) => ({
      duplicateSetupGroupSize: example.duplicateSetupGroupSize,
      name: example.name,
      setupLineCount: example.setupLineCount
    }))).toEqual([
      { duplicateSetupGroupSize: 2, name: 'a', setupLineCount: 2 },
      { duplicateSetupGroupSize: 2, name: 'b', setupLineCount: 2 },
      { duplicateSetupGroupSize: 0, name: 'c', setupLineCount: 0 }
    ]);
    expect(scored[0]!.score).toBeGreaterThan(baseScore);
  });
});
