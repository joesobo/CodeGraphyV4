import type Parser from 'tree-sitter';
import type { TreeWalkAction } from '../model';
import type { CSharpWalkState } from './model';
import { getResolvedNamespaceName } from './namespaceNames';
import { getNodeText } from '../nodes';

export function handleCSharpNamespaceNode(
  node: Parser.SyntaxNode,
  state: CSharpWalkState,
  walk: (node: Parser.SyntaxNode, context: CSharpWalkState) => void,
): TreeWalkAction<CSharpWalkState> {
  if (node.type === 'file_scoped_namespace_declaration') {
    return { skipChildren: true };
  }

  const namespaceName = getResolvedNamespaceName(node, state.currentNamespace);
  for (const child of node.namedChildren) {
    walk(child, {
      ...state,
      currentNamespace: namespaceName,
    });
  }

  return { skipChildren: true };
}

export function handleCSharpUsingDirective(
  node: Parser.SyntaxNode,
  usingNamespaces: Set<string>,
): void {
  const specifier = getNodeText(node.namedChildren[0]);
  if (specifier) {
    usingNamespaces.add(specifier);
  }
}
