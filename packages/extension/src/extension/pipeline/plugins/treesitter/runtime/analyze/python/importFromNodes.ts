import type Parser from 'tree-sitter';
import { getNodeText } from '../nodes';

export function getPythonImportFromModuleNode(node: Parser.SyntaxNode): Parser.SyntaxNode | undefined {
  return node.namedChildren.find((child) =>
    child.type === 'relative_import' || child.type === 'dotted_name',
  );
}

export function getPythonImportFromImportedNodes(
  node: Parser.SyntaxNode,
  moduleNode: Parser.SyntaxNode | undefined,
): Parser.SyntaxNode[] {
  return node.namedChildren.filter((child) =>
    (child.type === 'dotted_name' || child.type === 'aliased_import') && child !== moduleNode,
  );
}

export function getPythonImportedName(node: Parser.SyntaxNode): string | null {
  return node.type === 'aliased_import'
    ? getNodeText(node.childForFieldName('name') ?? node.namedChildren[0])
    : getNodeText(node);
}
