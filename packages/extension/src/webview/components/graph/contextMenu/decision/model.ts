import type {
  GraphContextMenuNode,
  GraphContextSelection,
} from '../contracts';

export type GraphContextMenuDecision =
  | { kind: 'background' }
  | { kind: 'edge'; targets: readonly string[] }
  | { kind: 'singleFolderNode'; target: string }
  | { kind: 'node'; targets: readonly string[] };

function createNodeTypeMap(nodes: readonly GraphContextMenuNode[]): Map<string, string> {
  return new Map(nodes.map(node => [node.id, node.nodeType ?? 'file']));
}

function getNodeType(nodeId: string, nodeTypes: ReadonlyMap<string, string>): string {
  if (nodeId.startsWith('pkg:')) {
    return 'package';
  }

  return nodeTypes.get(nodeId) ?? 'file';
}

export function decideGraphContextMenu(
  selection: GraphContextSelection,
  nodes: readonly GraphContextMenuNode[] = [],
): GraphContextMenuDecision {
  if (selection.kind === 'background') {
    return { kind: 'background' };
  }

  if (selection.kind === 'edge') {
    return { kind: 'edge', targets: selection.targets };
  }

  const nodeTypes = createNodeTypeMap(nodes);
  const target = selection.targets[0];
  if (
    selection.targets.length === 1
    && target
    && getNodeType(target, nodeTypes) === 'folder'
  ) {
    return { kind: 'singleFolderNode', target };
  }

  return { kind: 'node', targets: selection.targets };
}
