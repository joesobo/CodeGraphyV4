import type Parser from 'tree-sitter';
import { createTreeSitterRuntime } from './languages';

interface CSharpIndexedType {
  filePath: string;
  namespaceName: string | null;
  typeName: string;
}

interface CSharpWorkspaceIndex {
  typesByQualifiedName: Map<string, CSharpIndexedType>;
}

interface PreAnalyzeFileInput {
  absolutePath: string;
  content: string;
}

const csharpIndexes = new Map<string, CSharpWorkspaceIndex>();

function createEmptyIndex(): CSharpWorkspaceIndex {
  return {
    typesByQualifiedName: new Map(),
  };
}

function getIdentifierText(node: Parser.SyntaxNode | null | undefined): string | null {
  if (!node) {
    return null;
  }

  switch (node.type) {
    case 'identifier':
    case 'type_identifier':
      return node.text;
    default:
      return null;
  }
}

function getNodeText(node: Parser.SyntaxNode | null | undefined): string | null {
  if (!node) {
    return null;
  }

  const identifier = getIdentifierText(node);
  if (identifier) {
    return identifier;
  }

  switch (node.type) {
    case 'alias_qualified_name':
    case 'generic_name':
    case 'qualified_name':
      return node.text;
    default:
      return null;
  }
}

function getNamespaceName(node: Parser.SyntaxNode): string | null {
  const nameNode = node.childForFieldName('name');
  if (nameNode) {
    return getNodeText(nameNode);
  }

  for (const child of node.namedChildren) {
    if (
      child.type === 'identifier'
      || child.type === 'qualified_name'
      || child.type === 'alias_qualified_name'
    ) {
      return getNodeText(child);
    }
  }

  return null;
}

function getFileScopedNamespaceName(rootNode: Parser.SyntaxNode): string | null {
  const declaration = rootNode.namedChildren.find(
    (child) => child.type === 'file_scoped_namespace_declaration',
  );
  return declaration ? getNamespaceName(declaration) : null;
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
  });
}

function indexCSharpTree(
  tree: Parser.Tree,
  filePath: string,
  index: CSharpWorkspaceIndex,
): void {
  const fileScopedNamespaceName = getFileScopedNamespaceName(tree.rootNode);
  walkCSharpIndexTree(tree.rootNode, fileScopedNamespaceName, filePath, index);
}

function walkCSharpIndexTree(
  node: Parser.SyntaxNode,
  currentNamespace: string | null,
  filePath: string,
  index: CSharpWorkspaceIndex,
): void {
  const nextNamespace = getCSharpIndexNamespace(node, currentNamespace);
  if (nextNamespace === null) {
    return;
  }

  recordCSharpIndexedType(node, filePath, currentNamespace, index);
  for (const child of node.namedChildren) {
    walkCSharpIndexTree(child, nextNamespace, filePath, index);
  }
}

function getCSharpIndexNamespace(
  node: Parser.SyntaxNode,
  currentNamespace: string | null,
): string | null {
  if (node.type === 'file_scoped_namespace_declaration') {
    return null;
  }

  if (node.type === 'namespace_declaration') {
    return getNamespaceName(node) ?? currentNamespace;
  }

  return currentNamespace;
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

  const typeName = getIdentifierText(node.childForFieldName('name'));
  if (typeName) {
    recordIndexedType(index, filePath, currentNamespace, typeName);
  }
}

function isCSharpTypeDeclarationNode(node: Parser.SyntaxNode): boolean {
  return (
    node.type === 'class_declaration'
    || node.type === 'enum_declaration'
    || node.type === 'interface_declaration'
    || node.type === 'struct_declaration'
  );
}

export async function preAnalyzeCSharpTreeSitterFiles(
  files: PreAnalyzeFileInput[],
  workspaceRoot: string,
): Promise<void> {
  const csharpFiles = files.filter((file) => file.absolutePath.toLowerCase().endsWith('.cs'));
  if (csharpFiles.length === 0) {
    csharpIndexes.delete(workspaceRoot);
    return;
  }

  const index = createEmptyIndex();

  for (const file of csharpFiles) {
    const runtime = await createTreeSitterRuntime(file.absolutePath);
    if (!runtime || runtime.languageKind !== 'csharp') {
      continue;
    }

    indexCSharpTree(runtime.parser.parse(file.content), file.absolutePath, index);
  }

  csharpIndexes.set(workspaceRoot, index);
}

export function resolveCSharpTypePath(
  workspaceRoot: string,
  filePath: string,
  typeName: string,
  currentNamespace: string | null,
  usingNamespaces: readonly string[],
): string | null {
  const index = csharpIndexes.get(workspaceRoot);
  if (!index) {
    return null;
  }

  const qualifiedCandidates = typeName.includes('.')
    ? [typeName]
    : [
      ...(currentNamespace ? [`${currentNamespace}.${typeName}`] : []),
      ...usingNamespaces.map((namespaceName) => `${namespaceName}.${typeName}`),
      typeName,
    ];

  for (const candidate of qualifiedCandidates) {
    const match = index.typesByQualifiedName.get(candidate);
    if (!match || match.filePath === filePath) {
      continue;
    }

    return match.filePath;
  }

  return null;
}

export function resolveCSharpTypePathInNamespace(
  workspaceRoot: string,
  filePath: string,
  namespaceName: string,
  typeName: string,
): string | null {
  const index = csharpIndexes.get(workspaceRoot);
  if (!index) {
    return null;
  }

  const match = index.typesByQualifiedName.get(`${namespaceName}.${typeName}`);
  if (!match || match.filePath === filePath) {
    return null;
  }

  return match.filePath;
}
