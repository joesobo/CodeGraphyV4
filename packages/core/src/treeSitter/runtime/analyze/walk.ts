import type Parser from 'tree-sitter';
import type { SymbolWalkState, TreeWalkAction, TreeWalkVisitor } from './model';

export function walkTree<TContext>(
  node: Parser.SyntaxNode,
  context: TContext,
  visit: TreeWalkVisitor<TContext>,
): void {
  const walk = (nextNode: Parser.SyntaxNode, nextContext: TContext) => {
    walkTree(nextNode, nextContext, visit);
  };
  const action = visit(node, context, walk);
  if (action?.skipChildren) {
    return;
  }

  const nextContext = action?.nextContext ?? context;
  for (const child of node.namedChildren) {
    walk(child, nextContext);
  }
}

export function walkSymbolBody(
  node: Parser.SyntaxNode,
  symbolId: string,
  walk: (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
): TreeWalkAction<SymbolWalkState> {
  const body = node.childForFieldName('body') ?? node.namedChildren.at(-1);
  if (body) {
    walk(body, { currentSymbolId: symbolId });
  }

  return { skipChildren: true };
}
