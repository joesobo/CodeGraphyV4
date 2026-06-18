import type Parser from 'tree-sitter';
import {
  getCSharpFileScopedNamespaceName,
  getCSharpIdentifierText,
  getCSharpNamespaceName,
  isCSharpTypeDeclarationNode,
} from './nodes';
import type { CSharpIndexedType, CSharpWorkspaceIndex } from './store';

function getCSharpIndexedTypeKind(node: Parser.SyntaxNode): CSharpIndexedType['kind'] {
  if (node.type === 'interface_declaration') {
    return 'interface';
  }

  if (node.type === 'struct_declaration') {
    return 'struct';
  }

  if (node.type === 'enum_declaration') {
    return 'enum';
  }

  return 'class';
}

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
  kind: CSharpIndexedType['kind'],
  typeName: string,
  methodNames: Set<string>,
): void {
  const qualifiedName = namespaceName ? `${namespaceName}.${typeName}` : typeName;
  index.typesByQualifiedName.set(qualifiedName, {
    filePath,
    kind,
    methodNames,
    namespaceName,
    typeName,
  } satisfies CSharpIndexedType);
}

function collectCSharpMethodNames(node: Parser.SyntaxNode): Set<string> {
  const methodNames = new Set<string>();
  collectCSharpMethodNamesFromNode(node, methodNames);
  return methodNames;
}

function collectCSharpMethodNamesFromNode(
  node: Parser.SyntaxNode,
  methodNames: Set<string>,
): void {
  if (node.type === 'method_declaration') {
    const methodName = getCSharpIdentifierText(node.childForFieldName('name'));
    if (methodName) {
      methodNames.add(methodName);
    }
  }

  for (const child of node.namedChildren) {
    collectCSharpMethodNamesFromNode(child, methodNames);
  }
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
    recordIndexedType(
      index,
      filePath,
      currentNamespace,
      getCSharpIndexedTypeKind(node),
      typeName,
      collectCSharpMethodNames(node),
    );
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
