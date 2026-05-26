import type Parser from 'tree-sitter';

export function getSwiftTypeKind(node: Parser.SyntaxNode): 'actor' | 'class' | 'enum' | 'struct' {
  const declaration = node.text.trimStart();
  if (declaration.startsWith('struct ')) {
    return 'struct';
  }

  if (declaration.startsWith('enum ')) {
    return 'enum';
  }

  if (declaration.startsWith('actor ')) {
    return 'actor';
  }

  return 'class';
}
