import type Parser from 'tree-sitter';

export function visitObjectiveCNodes(node: Parser.SyntaxNode, visit: (node: Parser.SyntaxNode) => void): void {
  visit(node);
  for (const child of node.namedChildren) visitObjectiveCNodes(child, visit);
}

export function findFirstObjectiveCTypeIdentifier(node: Parser.SyntaxNode): string | null {
  if (node.type === 'type_identifier') return node.text;
  for (const child of node.namedChildren) {
    const typeName = findFirstObjectiveCTypeIdentifier(child);
    if (typeName) return typeName;
  }
  return null;
}

export function findLastObjectiveCIdentifier(node: Parser.SyntaxNode): string | null {
  let identifier: string | null = null;
  visitObjectiveCNodes(node, child => {
    if (child.type === 'identifier') identifier = child.text;
  });
  return identifier;
}
