import * as path from 'path';
import {
  normalizePathSlashes,
  toWorkspaceAbsolute,
  toWorkspaceRelative,
  type ResolverFsOps,
} from './pathResolverFs';
import { resolveWithUsedTypes } from './pathResolverUsedTypes';

export type ResolveIntraNamespaceOptions = {
  namespace: string;
  fromFile: string;
  usedTypes: Set<string>;
  workspaceRoot: string;
  sourceDirs: readonly string[];
  namespaceToFileMap: Map<string, string>;
  fsOps: ResolverFsOps;
};

function toAbsoluteFromFile(workspaceRoot: string, fromFile: string): string {
  const relativeFromFile = toWorkspaceRelative(workspaceRoot, fromFile);
  return toWorkspaceAbsolute(workspaceRoot, relativeFromFile);
}

function addRegisteredNamespaceMatches(options: ResolveIntraNamespaceOptions, resultSet: Set<string>): void {
  const normalizedFromFile = normalizePathSlashes(toAbsoluteFromFile(options.workspaceRoot, options.fromFile));

  for (const [registeredNamespace, filePath] of options.namespaceToFileMap.entries()) {
    if (registeredNamespace !== options.namespace) {
      continue;
    }

    const absolutePath = toWorkspaceAbsolute(options.workspaceRoot, filePath);
    if (absolutePath === normalizedFromFile) {
      continue;
    }

    const fileName = path.basename(filePath, '.cs');
    if (options.usedTypes.has(fileName)) {
      resultSet.add(absolutePath);
    }
  }
}

function addUsedTypeMatches(options: ResolveIntraNamespaceOptions, resultSet: Set<string>): void {
  const normalizedFromFile = normalizePathSlashes(toAbsoluteFromFile(options.workspaceRoot, options.fromFile));
  const resolvedByUsedTypes = resolveWithUsedTypes({
    namespace: options.namespace,
    usedTypes: options.usedTypes,
    sourceDirs: options.sourceDirs,
    workspaceRoot: options.workspaceRoot,
    fsOps: options.fsOps,
  });

  for (const resolvedPath of resolvedByUsedTypes) {
    if (normalizePathSlashes(resolvedPath) !== normalizedFromFile) {
      resultSet.add(normalizePathSlashes(resolvedPath));
    }
  }
}

function addRootSourceDirMatches(options: ResolveIntraNamespaceOptions, resultSet: Set<string>): void {
  const normalizedFromFile = normalizePathSlashes(toAbsoluteFromFile(options.workspaceRoot, options.fromFile));

  for (const sourceDir of options.sourceDirs) {
    for (const typeName of options.usedTypes) {
      const relativePath = sourceDir ? path.join(sourceDir, `${typeName}.cs`) : `${typeName}.cs`;
      if (!options.fsOps.fileExists(relativePath)) {
        continue;
      }

      const fullPath = toWorkspaceAbsolute(options.workspaceRoot, relativePath);
      if (fullPath !== normalizedFromFile) {
        resultSet.add(fullPath);
      }
    }
  }
}

export function resolveIntraNamespaceTypes(options: ResolveIntraNamespaceOptions): string[] {
  const results = new Set<string>();

  addRegisteredNamespaceMatches(options, results);
  addUsedTypeMatches(options, results);
  addRootSourceDirMatches(options, results);

  return Array.from(results);
}
