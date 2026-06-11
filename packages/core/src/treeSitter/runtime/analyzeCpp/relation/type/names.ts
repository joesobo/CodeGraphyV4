import type Parser from 'tree-sitter';

export function readCppTypeName(node: Parser.SyntaxNode): string | null {
  if (node.type === 'template_type') {
    return readCppTypeName(node.childForFieldName('name') ?? node.namedChildren[0]);
  }

  if (node.type === 'qualified_identifier') {
    const unqualifiedName = node.namedChildren.at(-1);
    return unqualifiedName ? readCppTypeName(unqualifiedName) : null;
  }

  return node.type.endsWith('identifier') ? node.text : null;
}
