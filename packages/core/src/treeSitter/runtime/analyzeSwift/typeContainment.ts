import type Parser from 'tree-sitter';

export function isInsideSwiftType(node: Parser.SyntaxNode): boolean {
  let current = node.parent;

  while (current) {
    if (
      current.type === 'class_declaration'
      || current.type === 'protocol_declaration'
      || current.type === 'extension_declaration'
    ) {
      return true;
    }

    current = current.parent;
  }

  return false;
}
