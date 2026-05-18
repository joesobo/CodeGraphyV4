import type Parser from 'tree-sitter';

interface FakeNodeOptions {
  children?: Parser.SyntaxNode[];
  fields?: Record<string, Parser.SyntaxNode | undefined>;
  text?: string;
  type: string;
}

export function createCSharpNode({
  type,
  text = '',
  children = [],
  fields = {},
}: FakeNodeOptions): Parser.SyntaxNode {
  return {
    type,
    text,
    namedChildren: children,
    childForFieldName(fieldName: string) {
      return fields[fieldName] ?? null;
    },
  } as Parser.SyntaxNode;
}
