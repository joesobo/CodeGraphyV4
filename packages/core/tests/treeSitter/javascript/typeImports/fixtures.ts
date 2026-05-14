import type Parser from 'tree-sitter';

export function node({
  type = 'node',
  text = '',
  children = [],
  namedChildren = [],
}: {
  type?: string;
  text?: string;
  children?: Parser.SyntaxNode[];
  namedChildren?: Parser.SyntaxNode[];
} = {}): Parser.SyntaxNode {
  return {
    type,
    text,
    children,
    namedChildren,
  } as unknown as Parser.SyntaxNode;
}

export function importStatement(
  importClause?: Parser.SyntaxNode,
  children: Parser.SyntaxNode[] = [],
): Parser.SyntaxNode {
  return node({
    type: 'import_statement',
    children,
    namedChildren: [
      ...(importClause ? [importClause] : []),
      node({ type: 'string', text: "'./types'" }),
    ],
  });
}

export function importClause(namedChildren: Parser.SyntaxNode[]): Parser.SyntaxNode {
  return node({
    type: 'import_clause',
    namedChildren,
  });
}

export function importSpecifier({
  text,
  children = [],
  namedChildren,
}: {
  text: string;
  children?: Parser.SyntaxNode[];
  namedChildren: Parser.SyntaxNode[];
}): Parser.SyntaxNode {
  return node({
    type: 'import_specifier',
    text,
    children,
    namedChildren,
  });
}

export function namedImports(importSpecifiers: Parser.SyntaxNode[]): Parser.SyntaxNode {
  return node({
    type: 'named_imports',
    namedChildren: importSpecifiers,
  });
}
