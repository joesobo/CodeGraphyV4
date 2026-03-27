import * as ts from 'typescript';
import { terminalCallName } from './callNames';
import {
  analyzeVitestSignals,
  isAsyncWaitCall,
  isConcurrencyCall,
  isEnvironmentMutationCall,
  isFakeTimerMutationCall,
  isSnapshotCall,
  isTypeOnlyAssertionCall
} from './vitestSignals';

const TEMP_RESOURCE_CALLS = new Set([
  'mkdtemp',
  'mkdtempSync',
  'mkdir',
  'mkdirSync',
  'tmpdir',
  'writeFile',
  'writeFileSync'
]);

const DEPTH_KINDS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.SwitchStatement,
  ts.SyntaxKind.TryStatement,
  ts.SyntaxKind.ConditionalExpression
]);

function isBranchNode(node: ts.Node): boolean {
  return DEPTH_KINDS.has(node.kind);
}

export function maxSetupDepth(node: ts.Node, depth = 0): number {
  const branchDepth = isBranchNode(node) ? depth + 1 : depth;
  let maxDepth = branchDepth;

  ts.forEachChild(node, (child) => {
    maxDepth = Math.max(maxDepth, maxSetupDepth(child, branchDepth));
  });

  return maxDepth;
}

export function countTempResourceWork(node: ts.Node): number {
  let count = 0;

  function walk(current: ts.Node): void {
    if (ts.isCallExpression(current)) {
      const callName = terminalCallName(current.expression);
      if (callName && TEMP_RESOURCE_CALLS.has(callName)) {
        count += 1;
      }
    }

    ts.forEachChild(current, walk);
  }

  walk(node);
  return count;
}

export { analyzeVitestSignals, isAsyncWaitCall, isConcurrencyCall, isEnvironmentMutationCall, isFakeTimerMutationCall, isSnapshotCall, isTypeOnlyAssertionCall };
