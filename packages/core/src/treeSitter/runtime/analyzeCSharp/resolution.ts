import type Parser from 'tree-sitter';
import {
  resolveCSharpType,
  resolveCSharpTypeInNamespace,
  type CSharpIndexedType,
} from '../csharpIndex';
import { getIdentifierText, getNodeText } from '../analyze/nodes';

export function normalizeCSharpTypeName(typeName: string): string {
  return typeName
    .replace(/\?.*$/u, '')
    .replace(/<.*$/u, '')
    .split('.')
    .filter(Boolean)
    .at(-1)
    ?? typeName;
}

export function getCSharpTypeName(node: Parser.SyntaxNode | null | undefined): string | null {
  const text = getNodeText(node) ?? getIdentifierText(node) ?? node?.text ?? null;
  return text ? normalizeCSharpTypeName(text) : null;
}

export function resolveCSharpUsingImport(
  workspaceRoot: string,
  filePath: string,
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
  typeName: string,
  currentNamespace: string | null,
): string | null {
  return resolveCSharpUsingType(
    workspaceRoot,
    filePath,
    usingNamespaces,
    importTargetsByNamespace,
    typeName,
    currentNamespace,
  )?.filePath ?? null;
}

export function resolveCSharpUsingType(
  workspaceRoot: string,
  filePath: string,
  usingNamespaces: ReadonlySet<string>,
  importTargetsByNamespace: Map<string, Set<string>>,
  typeName: string,
  currentNamespace: string | null,
): CSharpIndexedType | null {
  const normalizedTypeName = normalizeCSharpTypeName(typeName);
  for (const namespaceName of usingNamespaces) {
    const resolvedType = resolveCSharpTypeInNamespace(
      workspaceRoot,
      filePath,
      namespaceName,
      normalizedTypeName,
    );
    if (!resolvedType) {
      continue;
    }

    const paths = importTargetsByNamespace.get(namespaceName) ?? new Set<string>();
    paths.add(resolvedType.filePath);
    importTargetsByNamespace.set(namespaceName, paths);
    return resolvedType;
  }

  return resolveCSharpType(
    workspaceRoot,
    filePath,
    normalizedTypeName,
    currentNamespace,
    [...usingNamespaces],
  );
}

export function getCSharpTypeDeclarationKind(
  node: Parser.SyntaxNode,
): 'interface' | 'struct' | 'record' | 'enum' | 'delegate' | 'class' {
  if (node.type === 'delegate_declaration') {
    return 'delegate';
  }

  if (node.type === 'interface_declaration') {
    return 'interface';
  }

  if (node.type === 'struct_declaration') {
    return 'struct';
  }

  if (node.type === 'record_declaration') {
    return 'record';
  }

  if (node.type === 'enum_declaration') {
    return 'enum';
  }

  return 'class';
}
