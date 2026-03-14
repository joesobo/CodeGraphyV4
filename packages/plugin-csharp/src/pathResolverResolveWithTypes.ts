import * as path from 'path';
import type { IDetectedUsing } from './parserTypes';
import { isExternalNamespace } from './pathResolverExternalNamespace';
import { toWorkspaceAbsolute, type ResolverFsOps } from './pathResolverFs';
import { resolveWithUsedTypes } from './pathResolverUsedTypes';

export type ResolveWithTypesOptions = {
  usingDirective: IDetectedUsing;
  usedTypes: Set<string>;
  workspaceRoot: string;
  sourceDirs: readonly string[];
  namespaceToFileMap: Map<string, string>;
  fsOps: ResolverFsOps;
};

export function resolveUsingWithTypes(options: ResolveWithTypesOptions): string[] {
  if (isExternalNamespace(options.usingDirective.namespace)) {
    return [];
  }

  const results = new Set<string>();
  const registeredRelativePath = options.namespaceToFileMap.get(options.usingDirective.namespace);
  if (registeredRelativePath) {
    const fileName = path.basename(registeredRelativePath, '.cs');
    if (options.usedTypes.has(fileName)) {
      results.add(toWorkspaceAbsolute(options.workspaceRoot, registeredRelativePath));
    }
  }

  const resolvedByUsedTypes = resolveWithUsedTypes({
    namespace: options.usingDirective.namespace,
    usedTypes: options.usedTypes,
    sourceDirs: options.sourceDirs,
    workspaceRoot: options.workspaceRoot,
    fsOps: options.fsOps,
  });
  for (const resolvedPath of resolvedByUsedTypes) {
    results.add(resolvedPath);
  }

  return Array.from(results);
}
