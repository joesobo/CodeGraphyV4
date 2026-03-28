import * as ts from 'typescript';
import { baseCallName } from '../calls/names';
import { matchesTerminalName } from '../calls/propertyMatcher';

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

const MODULE_MOCK_CALLS = new Set([
  'doMock',
  'doUnmock',
  'hoisted',
  'importActual',
  'importMock',
  'mocked',
  'unmock'
]);

const SNAPSHOT_CALLS = new Set([
  'toMatchInlineSnapshot',
  'toMatchSnapshot'
]);

export function isEnvironmentMutationCall(node: ts.CallExpression): boolean {
  return baseCallName(node.expression) === 'vi' &&
    matchesTerminalName(node.expression, ENV_MUTATION_CALLS);
}

export function isFakeTimerMutationCall(node: ts.CallExpression): boolean {
  return baseCallName(node.expression) === 'vi' &&
    matchesTerminalName(node.expression, FAKE_TIMER_CALLS);
}

export function isModuleMockLifecycleCall(node: ts.CallExpression): boolean {
  return baseCallName(node.expression) === 'vi' &&
    matchesTerminalName(node.expression, MODULE_MOCK_CALLS);
}

export function isSnapshotCall(node: ts.CallExpression): boolean {
  return matchesTerminalName(node.expression, SNAPSHOT_CALLS);
}
