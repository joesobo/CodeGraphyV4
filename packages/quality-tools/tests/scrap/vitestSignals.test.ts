import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { callInfo, terminalCallName } from '../../src/scrap/callNames';
import {
  analyzeVitestSignals,
  isAsyncWaitCall,
  isConcurrencyCall,
  isEnvironmentMutationCall,
  isFakeTimerMutationCall,
  isSnapshotCall,
  isTypeOnlyAssertionCall
} from '../../src/scrap/vitestSignals';

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('sample.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function calls(source: string): ts.CallExpression[] {
  const sourceFile = parse(source);
  const result: ts.CallExpression[] = [];

  function walk(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      result.push(node);
    }
    ts.forEachChild(node, walk);
  }

  walk(sourceFile);
  return result;
}

function call(source: string, predicate: (value: ts.CallExpression) => boolean): ts.CallExpression {
  const result = calls(source).find(predicate);

  if (!result) {
    throw new Error('Expected call expression');
  }

  return result;
}

describe('vitestSignals', () => {
  it('detects snapshot assertions', () => {
    expect(isSnapshotCall(call(`expect(value).toMatchSnapshot();`, (value) => terminalCallName(value.expression) === 'toMatchSnapshot'))).toBe(true);
    expect(isSnapshotCall(call(`expect(value).toBe(value);`, (value) => terminalCallName(value.expression) === 'toBe'))).toBe(false);
  });

  it('detects async wait pressure', () => {
    expect(isAsyncWaitCall(call(`await waitFor(() => undefined);`, (value) => terminalCallName(value.expression) === 'waitFor'))).toBe(true);
    expect(isAsyncWaitCall(call(`await screen.findByText('ready');`, (value) => terminalCallName(value.expression)?.startsWith('findBy') === true))).toBe(true);
    expect(isAsyncWaitCall(call(`expect(value).toBe(true);`, (value) => terminalCallName(value.expression) === 'toBe'))).toBe(false);
  });

  it('detects fake timer and env mutation signals', () => {
    expect(isFakeTimerMutationCall(call(`vi.useFakeTimers();`, (value) => callInfo(value.expression).baseName === 'vi'))).toBe(true);
    expect(isFakeTimerMutationCall(call(`vi.mock('./thing');`, (value) => callInfo(value.expression).baseName === 'vi'))).toBe(false);
    expect(isEnvironmentMutationCall(call(`vi.stubEnv('A', 'B');`, (value) => callInfo(value.expression).baseName === 'vi'))).toBe(true);
    expect(isEnvironmentMutationCall(call(`vi.spyOn(console, 'log');`, (value) => callInfo(value.expression).baseName === 'vi'))).toBe(false);
  });

  it('detects concurrency wrappers without double counting each chains', () => {
    const concurrent = parse(`
      describe.concurrent('suite', () => {
        test.concurrent.each([[1]])('case', () => {});
      });
    `);

    expect(analyzeVitestSignals(concurrent).concurrencyCount).toBe(2);
    expect(isConcurrencyCall(call(`test.each([[1]])('case', () => {});`, (value) => callInfo(value.expression).baseName === 'test' && terminalCallName(value.expression) === 'each'))).toBe(false);
  });

  it('detects type-only assertions', () => {
    expect(isTypeOnlyAssertionCall(call(`expectTypeOf(value).toEqualTypeOf<string>();`, (value) => terminalCallName(value.expression) === 'expectTypeOf'))).toBe(true);
    expect(isTypeOnlyAssertionCall(call(`assertType<string>(value);`, (value) => terminalCallName(value.expression) === 'assertType'))).toBe(true);
    expect(isTypeOnlyAssertionCall(call(`expect(value).toBe(value);`, (value) => terminalCallName(value.expression) === 'toBe'))).toBe(false);
  });

  it('counts the Vitest operational signals in one pass', () => {
    const sourceFile = parse(`
      describe.concurrent('suite', () => {
        test.concurrent('case', async () => {
          vi.useFakeTimers();
          vi.setSystemTime(new Date());
          vi.stubEnv('A', 'B');
          vi.stubGlobal('fetch', () => undefined);
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
      snapshotCount: 2,
      typeOnlyAssertionCount: 2
    });
  });
});
