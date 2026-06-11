import type Parser from 'tree-sitter';

export function findDescendantByType(
  node: Parser.SyntaxNode | null | undefined,
  types: ReadonlySet<string>,
): Parser.SyntaxNode | null {
  const queue = node ? [node] : [];
  for (const candidate of queue) {
    if (types.has(candidate.type)) {
      return candidate;
    }

    queue.push(...candidate.namedChildren);
  }

  return null;
}
