import * as ts from 'typescript';

const TRACKED_FUNCTION_KINDS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
  ts.SyntaxKind.Constructor
]);

export function isTrackedFunctionNode(node: ts.Node): boolean {
  return TRACKED_FUNCTION_KINDS.has(node.kind);
}
