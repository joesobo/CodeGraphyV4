import * as path from 'path';
import type { ResolverFsOps } from './pathResolverFs';
import { toWorkspaceAbsolute } from './pathResolverFs';

export type UsedTypeResolveOptions = {
  namespace: string;
  usedTypes: Set<string>;
  sourceDirs: readonly string[];
  workspaceRoot: string;
  fsOps: ResolverFsOps;
};

function resolveSourceCandidate(
  sourceDir: string,
  namespacePath: string,
  typeName: string,
): string {
  if (!namespacePath) {
    return sourceDir ? path.join(sourceDir, `${typeName}.cs`) : `${typeName}.cs`;
  }
  return sourceDir
    ? path.join(sourceDir, namespacePath, `${typeName}.cs`)
    : path.join(namespacePath, `${typeName}.cs`);
}

export function resolveWithUsedTypes(options: UsedTypeResolveOptions): string[] {
  const namespaceParts = options.namespace.split('.');
  const resolvedPaths: string[] = [];

  for (let stripCount = 0; stripCount < namespaceParts.length; stripCount++) {
    const candidateNamespaceParts = namespaceParts.slice(stripCount);
    const candidateNamespacePath = candidateNamespaceParts.join('/');

    for (const sourceDir of options.sourceDirs) {
      for (const typeName of options.usedTypes) {
        const candidateFilePath = resolveSourceCandidate(
          sourceDir,
          candidateNamespacePath,
          typeName,
        );
        if (options.fsOps.fileExists(candidateFilePath)) {
          resolvedPaths.push(toWorkspaceAbsolute(options.workspaceRoot, candidateFilePath));
        }

        const namespaceEndsWithType =
          candidateNamespaceParts.length > 0 &&
          candidateNamespaceParts[candidateNamespaceParts.length - 1] === typeName;
        if (namespaceEndsWithType) {
          const parentNamespacePath = candidateNamespaceParts.slice(0, -1).join('/');
          const parentCandidateFilePath = resolveSourceCandidate(
            sourceDir,
            parentNamespacePath,
            typeName,
          );
          if (options.fsOps.fileExists(parentCandidateFilePath)) {
            resolvedPaths.push(toWorkspaceAbsolute(options.workspaceRoot, parentCandidateFilePath));
          }
        }
      }
    }
  }

  return Array.from(new Set(resolvedPaths));
}
