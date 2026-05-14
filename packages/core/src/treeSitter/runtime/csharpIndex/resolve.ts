import { getCSharpWorkspaceIndex } from './store';

export function resolveCSharpTypePath(
  workspaceRoot: string,
  filePath: string,
  typeName: string,
  currentNamespace: string | null,
  usingNamespaces: readonly string[],
): string | null {
  const index = getCSharpWorkspaceIndex(workspaceRoot);
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
  const index = getCSharpWorkspaceIndex(workspaceRoot);
  if (!index) {
    return null;
  }

  const match = index.typesByQualifiedName.get(`${namespaceName}.${typeName}`);
  if (!match || match.filePath === filePath) {
    return null;
  }

  return match.filePath;
}
