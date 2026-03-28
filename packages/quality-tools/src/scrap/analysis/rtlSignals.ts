import * as ts from 'typescript';
import { collectCallCount } from '../example/calls/extract';
import { baseCallName, terminalCallName } from '../calls/names';

const QUERY_PREFIXES = ['findAllBy', 'findBy', 'getAllBy', 'getBy', 'queryAllBy', 'queryBy'];
const RENDER_CALLS = new Set([
  'render',
  'renderHook',
  'rerender'
]);
const MUTATION_BASE_CALLS = new Set([
  'fireEvent',
  'userEvent'
]);

function hasQueryPrefix(terminal: string | undefined): boolean {
  return QUERY_PREFIXES.some((prefix) => terminal?.startsWith(prefix) ?? false);
}

export function isRtlQueryCall(node: ts.CallExpression): boolean {
  return hasQueryPrefix(terminalCallName(node.expression));
}

export function isRtlRenderCall(node: ts.CallExpression): boolean {
  return RENDER_CALLS.has(terminalCallName(node.expression) ?? '');
}

export function isRtlMutationCall(node: ts.CallExpression): boolean {
  return MUTATION_BASE_CALLS.has(baseCallName(node.expression) ?? '') ||
    terminalCallName(node.expression) === 'rerender';
}

export interface RtlSignalMetric {
  rtlMutationCount: number;
  rtlQueryCount: number;
  rtlRenderCount: number;
}

export function analyzeRtlSignals(node: ts.Node): RtlSignalMetric {
  return {
    rtlMutationCount: collectCallCount(node, isRtlMutationCall),
    rtlQueryCount: collectCallCount(node, isRtlQueryCall),
    rtlRenderCount: collectCallCount(node, isRtlRenderCall)
  };
}
