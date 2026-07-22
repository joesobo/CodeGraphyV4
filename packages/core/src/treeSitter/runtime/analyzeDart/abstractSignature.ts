import type Parser from 'tree-sitter';

export function isDartAbstractInterfaceMemberSignature(node: Parser.SyntaxNode): boolean {
  return listDartAncestors(node).some(isDartAbstractInterfaceClass);
}

function listDartAncestors(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
  const ancestors: Parser.SyntaxNode[] = [];
  for (let current: Parser.SyntaxNode | null = node.parent; current; current = current.parent) {
    ancestors.push(current);
  }
  return ancestors;
}

function isDartAbstractInterfaceClass(node: Parser.SyntaxNode): boolean {
  return node.type === 'class_definition' && /\babstract\s+interface\s+class\b/u.test(node.text);
}
