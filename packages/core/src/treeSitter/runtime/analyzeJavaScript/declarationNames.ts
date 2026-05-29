import type Parser from 'tree-sitter';
import { getIdentifierText } from '../analyze/nodes';

export function getJavaScriptDeclarationName(node: Parser.SyntaxNode): string | null {
  return getIdentifierText(node.childForFieldName('name') ?? node.namedChildren[0]);
}

export function getJavaScriptTypeDeclarationKind(
  node: Parser.SyntaxNode,
): 'type' | 'interface' | 'enum' {
  switch (node.type) {
    case 'interface_declaration':
      return 'interface';
    case 'enum_declaration':
      return 'enum';
    default:
      return 'type';
  }
}
