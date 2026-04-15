import type Parser from 'tree-sitter';
import {
  getCSharpFileScopedNamespaceName,
  getCSharpIdentifierText,
  getCSharpNamespaceName,
  isCSharpTypeDeclarationNode,
} from './nodes';
import type { CSharpIndexedType, CSharpWorkspaceIndex } from './store';

function getCSharpIndexNamespace(
  node: Parser.SyntaxNode,
  currentNamespace: string | null,
): string | null {
  if (
    node.type === 'file_scoped_namespace_declaration'
    || node.type === 'namespace_declaration'
  ) {
    return getCSharpNamespaceName(node) ?? currentNamespace;
  }

  return currentNamespace;
}

function recordIndexedType(
  index: CSharpWorkspaceIndex,
  filePath: string,
  namespaceName: string | null,
  typeName: string,
): void {
  const qualifiedName = namespaceName ? `${namespaceName}.${typeName}` : typeName;
  index.typesByQualifiedName.set(qualifiedName, {
    filePath,
    namespaceName,
    typeName,
  } satisfies CSharpIndexedType);
}

function recordCSharpIndexedType(
  node: Parser.SyntaxNode,
  filePath: string,
  currentNamespace: string | null,
  index: CSharpWorkspaceIndex,
): void {
  if (!isCSharpTypeDeclarationNode(node)) {
    return;
  }

  const typeName = getCSharpIdentifierText(node.childForFieldName('name'));
  if (typeName) {
    recordIndexedType(index, filePath, currentNamespace, typeName);
  }
}

function walkCSharpIndexTree(
  node: Parser.SyntaxNode,
  currentNamespace: string | null,
  filePath: string,
  index: CSharpWorkspaceIndex,
): void {
  const nextNamespace = getCSharpIndexNamespace(node, currentNamespace);
  recordCSharpIndexedType(node, filePath, currentNamespace, index);
  for (const child of node.namedChildren) {
    walkCSharpIndexTree(child, nextNamespace, filePath, index);
  }
}

export function indexCSharpTree(
  tree: Parser.Tree,
  filePath: string,
  index: CSharpWorkspaceIndex,
): void {
  const fileScopedNamespaceName = getCSharpFileScopedNamespaceName(tree.rootNode);
  walkCSharpIndexTree(tree.rootNode, fileScopedNamespaceName, filePath, index);
}
