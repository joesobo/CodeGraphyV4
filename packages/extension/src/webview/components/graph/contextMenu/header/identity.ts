import type {
  GraphContextMenuIdentity,
  GraphContextMenuNode,
} from '../contracts';

export function buildGraphContextMenuIdentity(
  nodeId: string,
  nodes: readonly GraphContextMenuNode[] | undefined,
): GraphContextMenuIdentity {
  const node = nodes?.find(candidate => candidate.id === nodeId);
  const label = node?.label?.trim() || nodeId;
  if (node?.nodeType === 'folder') {
    const folderLabel = withTrailingSlash(label);
    const folderId = withTrailingSlash(nodeId);
    return folderLabel === folderId
      ? { label: folderLabel }
      : { label: folderLabel, exactId: folderId };
  }

  return label === nodeId ? { label } : { label, exactId: nodeId };
}

function withTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}
