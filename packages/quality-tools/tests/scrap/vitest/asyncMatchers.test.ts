import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { terminalCallName } from '../../../src/scrap/calls/names';
import { isAsyncWaitCall, isConcurrencyCall } from '../../../src/scrap/vitest/asyncMatchers';
import { parseVitestCalls, selectVitestCall } from '../calls/helpers/vitestCallTestSupport';

describe('vitestAsyncMatchers', () => {
  it('detects async wait pressure for waitFor and findBy calls', () => {
    expect(isAsyncWaitCall(selectVitestCall(
      `await waitFor(() => undefined);`,
      (value) => terminalCallName(value.expression) === 'waitFor'
    ))).toBe(true);
    expect(isAsyncWaitCall(selectVitestCall(
      `await screen.findByText('ready');`,
      (value) => terminalCallName(value.expression)?.startsWith('findBy') === true
    ))).toBe(true);
    expect(isAsyncWaitCall(selectVitestCall(
      `await screen.findAllByText('ready');`,
      (value) => terminalCallName(value.expression)?.startsWith('findAllBy') === true
    ))).toBe(true);
  });

  it('rejects non-wait calls and expressions without a terminal matcher name', () => {
    expect(isAsyncWaitCall(selectVitestCall(
      `expect(value).toBe(true);`,
      (value) => terminalCallName(value.expression) === 'toBe'
    ))).toBe(false);
    expect(isAsyncWaitCall(selectVitestCall(
      `(makeMatcher())('ready');`,
      () => true
    ))).toBe(false);
  });

  it('detects concurrent wrappers on vitest suites and examples only', () => {
    const concurrentCalls = parseVitestCalls(`
      describe.concurrent('suite', () => {});
      test.skip.concurrent('case', () => {});
      suite.concurrent('case', () => {});
    `);

    expect(concurrentCalls.map((call) => isConcurrencyCall(call))).toEqual([true, true, false]);
  });

  it('does not treat each chains or identifier calls as concurrency wrappers', () => {
    expect(isConcurrencyCall(selectVitestCall(
      `test.concurrent.each([[1]])('case', () => {});`,
      (value) => ts.isCallExpression(value.expression)
    ))).toBe(false);
    expect(isConcurrencyCall(selectVitestCall(
      `concurrent('case', () => {});`,
      () => true
    ))).toBe(false);
    expect(isConcurrencyCall(selectVitestCall(
      `buildSuite().concurrent('case', () => {});`,
      (value) => terminalCallName(value.expression) === 'concurrent'
    ))).toBe(false);
  });
});
