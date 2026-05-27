import type Parser from 'tree-sitter';

export function getPhpTypeKind(node: Parser.SyntaxNode): 'class' | 'enum' | 'interface' | 'trait' {
  switch (node.type) {
    case 'interface_declaration':
      return 'interface';
    case 'trait_declaration':
      return 'trait';
    case 'enum_declaration':
      return 'enum';
    default:
      return 'class';
  }
}

export function getClauseTypeNames(node: Parser.SyntaxNode, clauseType: string): string[] {
  return node.namedChildren
    .filter((child) => child.type === clauseType)
    .flatMap((clause) => clause.namedChildren)
    .filter((child) => child.type === 'name' || child.type === 'qualified_name')
    .map((child) => child.text);
}
