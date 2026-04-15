import type Parser from 'tree-sitter';
import { resolveCSharpTypePath, resolveCSharpTypePathInNamespace } from '../csharpIndex';
import { getIdentifierText, getNodeText } from './nodes';

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
  const normalizedTypeName = normalizeCSharpTypeName(typeName);
  for (const namespaceName of usingNamespaces) {
    const resolvedPath = resolveCSharpTypePathInNamespace(
      workspaceRoot,
      filePath,
      namespaceName,
      normalizedTypeName,
    );
    if (!resolvedPath) {
      continue;
    }

    const paths = importTargetsByNamespace.get(namespaceName) ?? new Set<string>();
    paths.add(resolvedPath);
    importTargetsByNamespace.set(namespaceName, paths);
    return resolvedPath;
  }

  return resolveCSharpTypePath(
    workspaceRoot,
    filePath,
    normalizedTypeName,
    currentNamespace,
    [...usingNamespaces],
  );
}

export function getCSharpTypeDeclarationKind(
  node: Parser.SyntaxNode,
): 'interface' | 'struct' | 'enum' | 'class' {
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
