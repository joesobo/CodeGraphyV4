import type { GraphContextMenuNode } from '../contracts';
import type { GraphContextMenuDecision } from './model';
import { classifySingleNodeDecision } from './single';
import {
  classifyGraphContextNodeTargets,
  type GraphContextNodeKind,
  type GraphContextNodeTarget,
} from './targets';

function areAllNodeKind(
  targets: readonly GraphContextNodeTarget[],
  nodeKind: GraphContextNodeKind
): boolean {
  return targets.every(target => target.nodeKind === nodeKind);
}

export function decideNodeGraphContextMenu(
  targetIds: readonly string[],
  nodes?: readonly GraphContextMenuNode[],
): GraphContextMenuDecision {
  const targets = classifyGraphContextNodeTargets(targetIds, nodes);
  if (targets.length === 0) {
    return { kind: 'emptyNodeSelection' };
  }

  if (targets.length === 1) {
    return classifySingleNodeDecision(targets[0]);
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
