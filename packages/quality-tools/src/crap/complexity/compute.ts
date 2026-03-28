import * as ts from 'typescript';

const BRANCHING_KINDS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.CaseClause,
  ts.SyntaxKind.CatchClause,
  ts.SyntaxKind.ConditionalExpression
]);

const SHORT_CIRCUIT_OPERATORS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken
]);

function complexityIncrement(node: ts.Node): number {
  if (BRANCHING_KINDS.has(node.kind)) {
    return 1;
  }

  if (ts.isBinaryExpression(node) && SHORT_CIRCUIT_OPERATORS.has(node.operatorToken.kind)) {
    return 1;
  }

  return 0;
}

function walkComplexity(node: ts.Node): number {
  let total = complexityIncrement(node);
  ts.forEachChild(node, (child) => {
    total += walkComplexity(child);
  });
  return total;
}

export function computeComplexity(node: ts.Node): number {
  let total = 0;
  ts.forEachChild(node, (child) => {
    total += walkComplexity(child);
  });
  return total + 1;
}
