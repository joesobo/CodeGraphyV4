import type Parser from 'tree-sitter';
export { getSwiftTypeKind } from './typeKind';
export { isInsideSwiftType } from './typeContainment';

export function getSwiftDeclarationName(node: Parser.SyntaxNode): string | null {
  return node.childForFieldName('name')?.text
    ?? node.namedChildren.find((child) =>
      child.type === 'simple_identifier' || child.type === 'type_identifier',
    )?.text
    ?? null;
}
