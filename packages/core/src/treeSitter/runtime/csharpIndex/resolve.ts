import { getCSharpWorkspaceIndex } from './store';
import type { CSharpIndexedType } from './store';

export function resolveCSharpType(
  workspaceRoot: string,
  filePath: string,
  typeName: string,
  currentNamespace: string | null,
  usingNamespaces: readonly string[],
): CSharpIndexedType | null {
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

    return match;
  }

  return null;
}

export function resolveCSharpTypePath(
  workspaceRoot: string,
  filePath: string,
  typeName: string,
  currentNamespace: string | null,
  usingNamespaces: readonly string[],
): string | null {
  return resolveCSharpType(
    workspaceRoot,
    filePath,
    typeName,
    currentNamespace,
    usingNamespaces,
  )?.filePath ?? null;
}

export function resolveCSharpTypeInNamespace(
  workspaceRoot: string,
  filePath: string,
  namespaceName: string,
  typeName: string,
): CSharpIndexedType | null {
  const index = getCSharpWorkspaceIndex(workspaceRoot);
  if (!index) {
    return null;
  }

  const match = index.typesByQualifiedName.get(`${namespaceName}.${typeName}`);
  if (!match || match.filePath === filePath) {
    return null;
  }

  return match;
}

export function resolveCSharpTypePathInNamespace(
  workspaceRoot: string,
  filePath: string,
  namespaceName: string,
  typeName: string,
): string | null {
  return resolveCSharpTypeInNamespace(
    workspaceRoot,
    filePath,
    namespaceName,
    typeName,
  )?.filePath ?? null;
}

export function resolveCSharpInheritedMethodPath(
  workspaceRoot: string,
  baseTypePaths: readonly string[],
  methodName: string,
): string | null {
  const index = getCSharpWorkspaceIndex(workspaceRoot);
  if (!index) {
    return null;
  }

  return [...index.typesByQualifiedName.values()]
    .find((type) => baseTypePaths.includes(type.filePath) && type.methodNames.has(methodName))
    ?.filePath ?? null;
}
