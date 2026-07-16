import type Parser from 'tree-sitter';

export function isDartSelectorCall(node: Parser.SyntaxNode): boolean {
  return Boolean(findDartSelectorAncestor(node)?.text.startsWith('.'));
}

function findDartSelectorAncestor(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  for (let current: Parser.SyntaxNode | null = node.parent; current; current = current.parent) {
    if (current.type === 'selector') return current;
  }
  return null;
}
