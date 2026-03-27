import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { baseCallName, terminalCallName } from '../../src/scrap/callNames';
import {
  analyzeVitestSignals,
  isTypeOnlyAssertionCall
} from '../../src/scrap/vitestSignals';
import { selectVitestCall } from './vitestCallTestSupport';

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

describe('vitestSignals', () => {
  it('detects type-only assertions', () => {
    expect(isTypeOnlyAssertionCall(selectVitestCall(
      `expectTypeOf(value).toEqualTypeOf<string>();`,
      (value) => ts.isPropertyAccessExpression(value.expression) && baseCallName(value.expression) === 'expectTypeOf'
    ))).toBe(true);
    expect(isTypeOnlyAssertionCall(selectVitestCall(
      `assertType<string>(value);`,
      (value) => terminalCallName(value.expression) === 'assertType'
    ))).toBe(true);
    expect(isTypeOnlyAssertionCall(selectVitestCall(
      `expect(value).toBe(value);`,
      (value) => terminalCallName(value.expression) === 'expect'
    ))).toBe(false);
  });

  it('counts the Vitest operational signals in one pass', () => {
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

    expect(analyzeVitestSignals(sourceFile)).toEqual({
      asyncWaitCount: 2,
      concurrencyCount: 2,
      envMutationCount: 2,
      fakeTimerCount: 2,
      moduleMockCount: 2,
      snapshotCount: 2,
      typeOnlyAssertionCount: 2
    });
  });
});
