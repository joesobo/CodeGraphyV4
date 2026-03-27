import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { analyzeExample } from '../../src/scrap/exampleMetrics';
import { findExamples } from '../../src/scrap/findExamples';

function parse(source: string, scriptKind = ts.ScriptKind.TS): ts.SourceFile {
  return ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, scriptKind);
}

describe('analyzeExample', () => {
  it('collects counts, line ranges, and the example score', () => {
    const sourceFile = parse(`
      describe('suite', () => {
        function buildValue() {
          return 'value';
        }

        it('works', () => {
          if (ready) {
            vi.mock('./thing');
          }
          expect(buildValue()).toBe(value);
        });
      });
    `);

    const [example] = findExamples(sourceFile);
    const metric = analyzeExample(sourceFile, example!);

    expect(metric).toMatchObject({
      assertionCount: 1,
      blockPath: ['suite'],
      branchCount: 1,
      describeDepth: 1,
      duplicateSetupGroupSize: 0,
      helperCallCount: 1,
      helperHiddenLineCount: 3,
      mockCount: 1,
      name: 'works',
      setupLineCount: 3,
      startLine: 7,
      endLine: 12
    });
    expect(metric.lineCount).toBe(6);
    expect(metric.score).toBeGreaterThan(0);
  });

  it('records table-driven, setup-depth, and temp-resource signals', () => {
    const sourceFile = parse(`
      describe('suite', () => {
        test.each([[1]])('writes temp setup', () => {
          if (ready) {
            const tempRoot = tmpdir();
            mkdtempSync(tempRoot);
          }
          expect(true).toBe(true);
        });
      });
    `);

    const [example] = findExamples(sourceFile);
    const metric = analyzeExample(sourceFile, example!);

    expect(metric.tableDriven).toBe(true);
    expect(metric.setupDepth).toBe(1);
    expect(metric.tempResourceCount).toBe(2);
  });

  it('records Vitest-specific operational signals', () => {
    const sourceFile = parse(`
      describe.concurrent('suite', () => {
        test.concurrent('case', async () => {
          vi.useFakeTimers();
          vi.setSystemTime(new Date());
          vi.stubEnv('A', 'B');
          vi.stubGlobal('fetch', () => undefined);
          vi.doMock('./module');
          vi.mocked(fetch);
          await waitFor(() => undefined);
          await screen.findByText('ready');
          expect(value).toMatchSnapshot();
          expect(value).toMatchInlineSnapshot();
          expectTypeOf(value).toEqualTypeOf<string>();
          assertType<string>(value);
        });
      });
    `);

    const [example] = findExamples(sourceFile);
    const metric = analyzeExample(sourceFile, example!);

    expect(metric).toMatchObject({
      asyncWaitCount: 2,
      concurrencyCount: 2,
      envMutationCount: 2,
      fakeTimerCount: 2,
      moduleMockCount: 2,
      snapshotCount: 2,
      typeOnlyAssertionCount: 2
    });
    expect(metric.assertionCount).toBe(4);
  });
});
