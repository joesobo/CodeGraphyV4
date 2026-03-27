import * as ts from 'typescript';

function isNormalizedLiteralKind(kind: ts.SyntaxKind): boolean {
  switch (kind) {
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
    case ts.SyntaxKind.NumericLiteral:
    case ts.SyntaxKind.TrueKeyword:
    case ts.SyntaxKind.FalseKeyword:
    case ts.SyntaxKind.NullKeyword:
      return true;
    default:
      return false;
  }
}

function normalizedLeafFingerprint(node: ts.Node): string | undefined {
  if (ts.isIdentifier(node)) {
    return 'id';
  }

  if (isNormalizedLiteralKind(node.kind)) {
    return 'lit';
  }

  return undefined;
}

function fingerprintChildren(node: ts.Node): string[] {
  const children: string[] = [];
  ts.forEachChild(node, (child) => {
    children.push(fingerprintNode(child));
  });
  return children;
}

export function fingerprintNode(node: ts.Node): string {
  const normalizedLeaf = normalizedLeafFingerprint(node);
  if (normalizedLeaf) {
    return normalizedLeaf;
  }

  return `${node.kind}[${fingerprintChildren(node).join(',')}]`;
}

function collectFeatures(node: ts.Node, features: Set<string>): void {
  features.add(fingerprintNode(node));
  ts.forEachChild(node, (child) => collectFeatures(child, features));
}

export function statementFingerprint(statements: ts.Statement[]): string | undefined {
  if (statements.length === 0) {
    return undefined;
  }

  return statements.map((statement) => fingerprintNode(statement)).join('|');
}

export function statementFeatures(statements: ts.Statement[]): string[] {
  const features = new Set<string>();
  statements.forEach((statement) => collectFeatures(statement, features));
  return [...features].sort();
}
