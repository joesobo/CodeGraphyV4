import * as ts from 'typescript';

type NodeSerializer = (node: ts.Node) => string;

const NORMALIZED_LITERAL_KINDS = new Set<ts.SyntaxKind>([
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.TrueKeyword,
  ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.NullKeyword
]);

function isNormalizedLiteralKind(kind: ts.SyntaxKind): boolean {
  return NORMALIZED_LITERAL_KINDS.has(kind);
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

function literalShapeLeafFingerprint(node: ts.Node): string | undefined {
  if (ts.isIdentifier(node)) {
    return node.text;
  }

  if (isNormalizedLiteralKind(node.kind)) {
    return 'lit';
  }

  return undefined;
}

function fingerprintChildren(node: ts.Node, serializer: NodeSerializer): string[] {
  const children: string[] = [];
  ts.forEachChild(node, (child) => {
    children.push(serializer(child));
  });
  return children;
}

function fingerprintNodeWithLeaf(
  node: ts.Node,
  leafFingerprint: (current: ts.Node) => string | undefined
): string {
  const leaf = leafFingerprint(node);
  if (leaf) {
    return leaf;
  }

  return `${node.kind}[${fingerprintChildren(node, (child) => fingerprintNodeWithLeaf(child, leafFingerprint)).join(',')}]`;
}

export function fingerprintNode(node: ts.Node): string {
  return fingerprintNodeWithLeaf(node, normalizedLeafFingerprint);
}

function collectFeatures(node: ts.Node, features: Set<string>, serializer: NodeSerializer): void {
  features.add(serializer(node));
  ts.forEachChild(node, (child) => collectFeatures(child, features, serializer));
}

function statementFingerprintWithSerializer(
  statements: ts.Statement[],
  serializer: NodeSerializer
): string | undefined {
  if (statements.length === 0) {
    return undefined;
  }

  return statements.map((statement) => serializer(statement)).join('|');
}

export function statementFingerprint(statements: ts.Statement[]): string | undefined {
  return statementFingerprintWithSerializer(statements, fingerprintNode);
}

export function literalShapeFingerprint(statements: ts.Statement[]): string | undefined {
  return statementFingerprintWithSerializer(
    statements,
    (statement) => fingerprintNodeWithLeaf(statement, literalShapeLeafFingerprint)
  );
}

export function statementFeatures(statements: ts.Statement[]): string[] {
  const features = new Set<string>();
  statements.forEach((statement) => collectFeatures(statement, features, fingerprintNode));
  return [...features].sort();
}
