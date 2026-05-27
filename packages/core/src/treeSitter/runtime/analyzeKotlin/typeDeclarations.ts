import type Parser from 'tree-sitter';
export { isInsideKotlinType } from './typeContainment';

export function getKotlinTypeKind(node: Parser.SyntaxNode): 'enum' | 'interface' | 'class' {
  const declarationText = node.text.trimStart();
  if (declarationText.startsWith('interface ')) {
    return 'interface';
  }

  if (declarationText.startsWith('enum class ')) {
    return 'enum';
  }

  return 'class';
}

export function getDelegatedTypeNames(node: Parser.SyntaxNode): string[] {
  const delegationSpecifiers = node.namedChildren.find((child) =>
    child.type === 'delegation_specifiers',
  );
  if (!delegationSpecifiers) {
    return [];
  }

  return delegationSpecifiers.descendantsOfType('user_type')
    .map((typeNode) => typeNode.namedChildren.find((child) => child.type === 'identifier')?.text)
    .filter((typeName): typeName is string => Boolean(typeName));
}
