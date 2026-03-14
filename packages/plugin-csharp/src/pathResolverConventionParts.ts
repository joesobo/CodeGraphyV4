import * as path from 'path';
import type { ResolverFsOps } from './pathResolverFs';
import { normalizePathSlashes } from './pathResolverFs';

export function tryResolveNamespaceParts(
  namespaceParts: readonly string[],
  sourceDirs: readonly string[],
  fsOps: ResolverFsOps,
): string | null {
  if (namespaceParts.length === 0) {
    return null;
  }

  for (const sourceDir of sourceDirs) {
    const directoryPath = namespaceParts.slice(0, -1).join('/');
    const fileName = `${namespaceParts[namespaceParts.length - 1]}.cs`;
    const explicitFilePath = sourceDir
      ? path.join(sourceDir, directoryPath, fileName)
      : path.join(directoryPath, fileName);
    if (fsOps.fileExists(explicitFilePath)) {
      return normalizePathSlashes(explicitFilePath);
    }

    const namespaceDirectory = sourceDir
      ? path.join(sourceDir, namespaceParts.join('/'))
      : namespaceParts.join('/');
    if (fsOps.directoryExists(namespaceDirectory)) {
      const discoveredFile = fsOps.findCsFileInDir(namespaceDirectory);
      if (discoveredFile) {
        return normalizePathSlashes(discoveredFile);
      }
    }

    const simpleFilePath = sourceDir
      ? path.join(sourceDir, `${namespaceParts[namespaceParts.length - 1]}.cs`)
      : `${namespaceParts[namespaceParts.length - 1]}.cs`;
    if (fsOps.fileExists(simpleFilePath)) {
      return normalizePathSlashes(simpleFilePath);
    }
  }

  return null;
}
