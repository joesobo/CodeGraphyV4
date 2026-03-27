import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { allExampleStatements, analyzeExampleSetup, assertionStatements, setupStatements } from '../../src/scrap/exampleSetup';
import { findExamples } from '../../src/scrap/findExamples';

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

describe('analyzeExampleSetup', () => {
  it('splits setup statements from assertion statements at the first expectation', () => {
    const sourceFile = parse(`
      test('split', () => {
        const value = createValue();
        arrangeExtra(value);
        expect(value).toBeDefined();
        expect(value.label).toBe('ready');
      });
    `);

    const [example] = findExamples(sourceFile);
    expect(setupStatements(example!).map((statement) => statement.getText(sourceFile))).toEqual([
      'const value = createValue();',
      'arrangeExtra(value);'
    ]);
    expect(assertionStatements(example!).map((statement) => statement.getText(sourceFile))).toEqual([
      'expect(value).toBeDefined();',
      "expect(value.label).toBe('ready');"
    ]);
    expect(allExampleStatements(example!).map((statement) => statement.getText(sourceFile))).toHaveLength(4);
  });

  it('treats type-only assertions as assertions when splitting setup', () => {
    const sourceFile = parse(`
      test('types', () => {
        const value = createValue();
        expectTypeOf(value).toEqualTypeOf<string>();
        expect(value).toBeDefined();
      });
    `);

    const [example] = findExamples(sourceFile);
    expect(setupStatements(example!).map((statement) => statement.getText(sourceFile))).toEqual([
      'const value = createValue();'
    ]);
    expect(assertionStatements(example!).map((statement) => statement.getText(sourceFile))).toEqual([
      'expectTypeOf(value).toEqualTypeOf<string>();',
      'expect(value).toBeDefined();'
    ]);
  });

  it('captures setup lines and matches structurally duplicated setup', () => {
    const sourceFile = parse(`
      describe('suite', () => {
        it('a', () => {
          const firstValue = createValue('a');
          vi.mock('./alpha');
          expect(firstValue).toBeDefined();
        });

        it('b', () => {
          const secondValue = createValue('b');
          vi.mock('./beta');
          expect(secondValue).toBeDefined();
        });
      });
    `);

    const examples = findExamples(sourceFile);
    const first = analyzeExampleSetup(sourceFile, examples[0]!);
    const second = analyzeExampleSetup(sourceFile, examples[1]!);

    expect(first.setupLineCount).toBe(2);
    expect(second.setupLineCount).toBe(2);
    expect(first.setupFingerprint).toBe(second.setupFingerprint);
  });

  it('returns an empty setup when the assertion is the first statement', () => {
    const sourceFile = parse(`
      test('inline', () => {
        expect(true).toBe(true);
      });
    `);

    const [example] = findExamples(sourceFile);
    expect(analyzeExampleSetup(sourceFile, example!)).toEqual({
      setupFingerprint: undefined,
      setupLineCount: 0
    });
  });

  it('returns an empty setup for expression-bodied examples', () => {
    const sourceFile = parse(`
      test('inline', () => expect(true).toBe(true));
    `);

    const [example] = findExamples(sourceFile);
    expect(analyzeExampleSetup(sourceFile, example!)).toEqual({
      setupFingerprint: undefined,
      setupLineCount: 0
    });
  });

  it('treats the entire block as setup when there are no assertions', () => {
    const sourceFile = parse(`
      test('setup-only', () => {
        const value = createValue();
        arrangeExtra(value);
      });
    `);

    const [example] = findExamples(sourceFile);
    expect(setupStatements(example!).map((statement) => statement.getText(sourceFile))).toEqual([
      'const value = createValue();',
      'arrangeExtra(value);'
    ]);
    expect(assertionStatements(example!)).toEqual([]);
  });
});
