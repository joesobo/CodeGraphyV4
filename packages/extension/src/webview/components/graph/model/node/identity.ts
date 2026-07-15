export function isPackageNodeId(nodeId: string): boolean {
  return nodeId.startsWith('pkg:');
}
