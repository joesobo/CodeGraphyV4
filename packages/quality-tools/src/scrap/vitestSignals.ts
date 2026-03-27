import * as ts from 'typescript';
import { collectCallCount, isTypeOnlyAssertionCall } from './exampleCalls';
import { baseCallName, terminalCallName } from './callNames';

const ASYNC_WAIT_CALLS = new Set([
  'waitFor',
  'waitForElementToBeRemoved'
]);

const CONCURRENT_BASE_CALLS = new Set([
  'describe',
  'it',
  'test'
]);

const ENV_MUTATION_CALLS = new Set([
  'stubEnv',
  'stubGlobal',
  'unstubAllEnvs',
  'unstubAllGlobals'
]);

const FAKE_TIMER_CALLS = new Set([
  'setSystemTime',
  'useFakeTimers',
  'useRealTimers'
]);

const SNAPSHOT_CALLS = new Set([
  'toMatchInlineSnapshot',
  'toMatchSnapshot'
]);

function hasPropertyName(expression: ts.LeftHandSideExpression, name: string): boolean {
  if (ts.isIdentifier(expression)) {
    return false;
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text === name || hasPropertyName(expression.expression, name);
  }

  if (ts.isCallExpression(expression)) {
    return hasPropertyName(expression.expression, name);
  }

  return false;
}

function matchesTerminalName(expression: ts.LeftHandSideExpression, names: Set<string>): boolean {
  const name = terminalCallName(expression);
  return name !== undefined && names.has(name);
}

export function isAsyncWaitCall(node: ts.CallExpression): boolean {
  const terminal = terminalCallName(node.expression);
  return terminal !== undefined && (
    ASYNC_WAIT_CALLS.has(terminal) ||
    terminal.startsWith('findBy') ||
    terminal.startsWith('findAllBy')
  );
}

export function isConcurrencyCall(node: ts.CallExpression): boolean {
  return ts.isPropertyAccessExpression(node.expression) &&
    hasPropertyName(node.expression, 'concurrent') &&
    CONCURRENT_BASE_CALLS.has(baseCallName(node.expression) ?? '');
}

export function isEnvironmentMutationCall(node: ts.CallExpression): boolean {
  return baseCallName(node.expression) === 'vi' && matchesTerminalName(node.expression, ENV_MUTATION_CALLS);
}

export function isFakeTimerMutationCall(node: ts.CallExpression): boolean {
  return baseCallName(node.expression) === 'vi' && matchesTerminalName(node.expression, FAKE_TIMER_CALLS);
}

export function isSnapshotCall(node: ts.CallExpression): boolean {
  return matchesTerminalName(node.expression, SNAPSHOT_CALLS);
}

export { isTypeOnlyAssertionCall } from './exampleCalls';

export interface VitestSignalMetric {
  asyncWaitCount: number;
  concurrencyCount: number;
  envMutationCount: number;
  fakeTimerCount: number;
  snapshotCount: number;
  typeOnlyAssertionCount: number;
}

export function analyzeVitestSignals(node: ts.Node): VitestSignalMetric {
  function countConcurrentAncestors(current: ts.Node): number {
    let count = 0;
    let parent = current.parent;

    while (parent) {
      if (ts.isCallExpression(parent) && isConcurrencyCall(parent)) {
        count += 1;
      }

      parent = parent.parent;
    }

    return count;
  }

  return {
    asyncWaitCount: collectCallCount(node, isAsyncWaitCall),
    concurrencyCount: collectCallCount(node, isConcurrencyCall) + countConcurrentAncestors(node),
    envMutationCount: collectCallCount(node, isEnvironmentMutationCall),
    fakeTimerCount: collectCallCount(node, isFakeTimerMutationCall),
    snapshotCount: collectCallCount(node, isSnapshotCall),
    typeOnlyAssertionCount: collectCallCount(node, isTypeOnlyAssertionCall)
  };
}
