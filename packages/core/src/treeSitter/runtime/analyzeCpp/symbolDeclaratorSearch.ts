import type Parser from 'tree-sitter';

type DeclaratorNameReader = (node: Parser.SyntaxNode | null | undefined) => Parser.SyntaxNode | null;

export function findFirstDeclaratorNameNode(
  nodes: ReadonlyArray<Parser.SyntaxNode>,
  readName: DeclaratorNameReader,
): Parser.SyntaxNode | null {
  for (const child of nodes) {
    const match = readName(child);
    if (match) {
      return match;
    }
  }

  return null;
}

export function findLastDeclaratorNameNode(
  nodes: ReadonlyArray<Parser.SyntaxNode>,
  readName: DeclaratorNameReader,
): Parser.SyntaxNode | null {
  for (const child of [...nodes].reverse()) {
    const match = readName(child);
    if (match) {
      return match;
    }
  }

  return null;
}
