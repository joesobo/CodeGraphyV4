import type {
  GraphContextMenuNode,
  GraphContextSelection,
} from '../contracts';
import { classifyGraphContextNodeTarget } from './targets';
import type { GraphContextNodeKind, GraphContextNodeTarget } from './targets';

export type GraphContextMenuDecision =
  | { kind: 'background' }
  | { kind: 'edge'; targets: readonly string[]; edgeId?: string }
  | { kind: 'emptyNodeSelection' }
  | { kind: 'singleFileNode'; target: GraphContextNodeTarget }
  | { kind: 'singleFolderNode'; target: GraphContextNodeTarget }
  | { kind: 'singlePackageNode'; target: GraphContextNodeTarget }
  | { kind: 'singlePluginNode'; target: GraphContextNodeTarget }
  | { kind: 'multiFileNodes'; targets: readonly GraphContextNodeTarget[] }
  | { kind: 'multiFolderNodes'; targets: readonly GraphContextNodeTarget[] }
  | { kind: 'multiPackageNodes'; targets: readonly GraphContextNodeTarget[] }
  | { kind: 'mixedNodeSelection'; targets: readonly GraphContextNodeTarget[] };

function createNodeTypeMap(nodes: readonly GraphContextMenuNode[]): Map<string, string> {
  return new Map(nodes.map(node => [node.id, node.nodeType ?? 'file']));
}

function classifyNodeTargets(
  targetIds: readonly string[],
  nodes: readonly GraphContextMenuNode[],
): GraphContextNodeTarget[] {
  const nodeTypes = createNodeTypeMap(nodes);
  return targetIds.map(targetId =>
    classifyGraphContextNodeTarget(targetId, nodeTypes.get(targetId))
  );
}

function classifySingleNodeTarget(target: GraphContextNodeTarget): GraphContextMenuDecision {
  switch (target.nodeKind) {
    case 'file':
      return { kind: 'singleFileNode', target };
    case 'folder':
      return { kind: 'singleFolderNode', target };
    case 'package':
      return { kind: 'singlePackageNode', target };
    case 'plugin':
      return { kind: 'singlePluginNode', target };
  }
}

function areAllNodeKind(
  targets: readonly GraphContextNodeTarget[],
  nodeKind: GraphContextNodeKind
): boolean {
  return targets.every(target => target.nodeKind === nodeKind);
}

export function decideGraphContextMenu(
  selection: GraphContextSelection,
  nodes: readonly GraphContextMenuNode[] = [],
): GraphContextMenuDecision {
  if (selection.kind === 'background') {
    return { kind: 'background' };
  }

  if (selection.kind === 'edge') {
    return { kind: 'edge', edgeId: selection.edgeId, targets: selection.targets };
  }

  const targets = classifyNodeTargets(selection.targets, nodes);
  if (targets.length === 0) {
    return { kind: 'emptyNodeSelection' };
  }

  if (targets.length === 1) {
    return classifySingleNodeTarget(targets[0]);
  }

  if (areAllNodeKind(targets, 'file')) {
    return { kind: 'multiFileNodes', targets };
  }

  if (areAllNodeKind(targets, 'folder')) {
    return { kind: 'multiFolderNodes', targets };
  }

  if (areAllNodeKind(targets, 'package')) {
    return { kind: 'multiPackageNodes', targets };
  }

  return { kind: 'mixedNodeSelection', targets };
}
