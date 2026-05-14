import type { IGraphData } from '../../graph/contracts';

export const WORKSPACE_PACKAGE_NODE_ID_PREFIX = 'pkg:workspace:' as const;

export function isFileNode(node: IGraphData['nodes'][number]): boolean {
  return (node.nodeType ?? 'file') === 'file';
}

export function getWorkspacePackageNodeId(rootPath: string): string {
  return `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}${rootPath}`;
}
