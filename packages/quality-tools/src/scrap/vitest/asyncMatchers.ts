import * as ts from 'typescript';
import { baseCallName, terminalCallName } from '../calls/names';
import { hasPropertyName } from '../calls/propertyMatcher';

const ASYNC_WAIT_CALLS = new Set([
  'waitFor',
  'waitForElementToBeRemoved'
]);

const CONCURRENT_BASE_CALLS = new Set([
  'describe',
  'it',
  'test'
]);

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
