/**
 * @fileoverview Helpers for materializing external package nodes from unresolved imports.
 * @module extension/workspaceAnalyzer/graph/packageSpecifiers
 */

export const PACKAGE_NODE_ID_PREFIX = 'pkg:';

export function isExternalPackageSpecifier(specifier: string): boolean {
  if (specifier.startsWith('node:')) {
    return true;
  }

  if (
    specifier.startsWith('.')
    || specifier.startsWith('/')
    || specifier.startsWith('#')
  ) {
    return false;
  }

  return /^(@[\w-]+\/)?[\w-]/.test(specifier);
}

export function getExternalPackageName(specifier: string): string | null {
  if (!isExternalPackageSpecifier(specifier)) {
    return null;
  }

  const normalized = specifier.startsWith('node:')
    ? specifier.slice(5)
    : specifier;

  if (normalized.startsWith('@')) {
    const [scope, name] = normalized.split('/');
    return scope && name ? `${scope}/${name}` : normalized;
  }

  const [packageName] = normalized.split('/');
  return packageName ?? null;
}

export function getExternalPackageNodeId(specifier: string): string | null {
  const packageName = getExternalPackageName(specifier);
  return packageName ? `${PACKAGE_NODE_ID_PREFIX}${packageName}` : null;
}

export function isExternalPackageNodeId(nodeId: string): boolean {
  return nodeId.startsWith(PACKAGE_NODE_ID_PREFIX);
}

export function getExternalPackageLabelFromNodeId(nodeId: string): string {
  return nodeId.slice(PACKAGE_NODE_ID_PREFIX.length);
}
