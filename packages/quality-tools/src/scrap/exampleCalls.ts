import * as ts from 'typescript';
import { terminalCallName } from './callNames';

const BRANCHING_KINDS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.SwitchStatement,
  ts.SyntaxKind.ConditionalExpression
]);

export function isExpectCall(node: ts.CallExpression): boolean {
  return ts.isIdentifier(node.expression) && node.expression.text === 'expect';
}

export function isTypeOnlyAssertionCall(node: ts.CallExpression): boolean {
  const terminal = terminalCallName(node.expression);
  return terminal === 'assertType' || terminal === 'expectTypeOf';
}

export function isAssertionCall(node: ts.CallExpression): boolean {
  return isExpectCall(node) || isTypeOnlyAssertionCall(node);
}

export function isMockCall(node: ts.CallExpression): boolean {
  return ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    ['vi', 'jest'].includes(node.expression.expression.text) &&
    ['mock', 'spyOn'].includes(node.expression.name.text);
}

export function countBranches(node: ts.Node): number {
  let total = BRANCHING_KINDS.has(node.kind) ? 1 : 0;
  ts.forEachChild(node, (child) => {
    total += countBranches(child);
  });
  return total;
}

export function collectCallCount(
  node: ts.Node,
  matcher: (value: ts.CallExpression) => boolean
): number {
  let count = 0;

  function walk(current: ts.Node): void {
    if (ts.isCallExpression(current) && matcher(current)) {
      count++;
    }
    ts.forEachChild(current, walk);
  }

  walk(node);
  return count;
}
