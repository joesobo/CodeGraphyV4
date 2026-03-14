import type { ResolverFsOps } from './pathResolverFs';
import { tryResolveNamespaceParts } from './pathResolverConventionParts';

export type ConventionResolveOptions = {
  namespace: string;
  rootNamespace?: string;
  sourceDirs: readonly string[];
  fsOps: ResolverFsOps;
};

function resolveWithExplicitRootNamespace(options: ConventionResolveOptions): string | null {
  if (!options.rootNamespace) {
    return null;
  }

  const namespaceParts = options.namespace.split('.');
  const rootParts = options.rootNamespace.split('.');
  const hasRootPrefix = namespaceParts.slice(0, rootParts.length).join('.') === options.rootNamespace;
  if (!hasRootPrefix) {
    return null;
  }

  return tryResolveNamespaceParts(namespaceParts.slice(rootParts.length), options.sourceDirs, options.fsOps);
}

function resolveByAutoDetectingRootNamespace(options: ConventionResolveOptions): string | null {
  const namespaceParts = options.namespace.split('.');
  for (let stripCount = 0; stripCount < namespaceParts.length; stripCount++) {
    const candidateParts = namespaceParts.slice(stripCount);
    const resolved = tryResolveNamespaceParts(candidateParts, options.sourceDirs, options.fsOps);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

export function conventionBasedResolve(options: ConventionResolveOptions): string | null {
  const explicitRootResolvedPath = resolveWithExplicitRootNamespace(options);
  if (explicitRootResolvedPath) {
    return explicitRootResolvedPath;
  }
  return resolveByAutoDetectingRootNamespace(options);
}
