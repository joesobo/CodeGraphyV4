import { getExternalPackageName } from './name';

export const PACKAGE_NODE_ID_PREFIX = 'pkg:';

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
