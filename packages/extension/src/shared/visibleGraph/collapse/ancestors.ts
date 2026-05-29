export function findVisibleCollapsedAncestor(
  nodeId: string,
  collapsedFolderIds: ReadonlySet<string>,
): string | undefined {
  return Array.from(collapsedFolderIds)
    .filter((folderId) => folderId === nodeId || isDescendantOf(folderId, nodeId))
    .sort((left, right) => getPathDepth(left) - getPathDepth(right))[0];
}

export function isDescendantOf(folderId: string, nodeId: string): boolean {
  if (folderId === '(root)') {
    return nodeId !== '(root)';
  }

  return nodeId.startsWith(`${folderId}/`);
}

function getPathDepth(nodeId: string): number {
  return nodeId === '(root)' ? 0 : nodeId.split('/').length;
}
