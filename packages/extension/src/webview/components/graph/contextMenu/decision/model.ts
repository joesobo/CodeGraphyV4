import type {
  GraphContextMenuNode,
  GraphContextSelection,
} from '../contracts';
import { decideNodeGraphContextMenu } from './selection';
import type { GraphContextNodeTarget } from './targets';

export type GraphContextMenuDecision =
  | { kind: 'background' }
  | { kind: 'edge'; targets: readonly string[]; edgeId?: string }
  | { kind: 'emptyNodeSelection' }
  | { kind: 'singleFileNode'; target: GraphContextNodeTarget }
  | { kind: 'singleFolderNode'; target: GraphContextNodeTarget }
  | { kind: 'singlePackageNode'; target: GraphContextNodeTarget }
  | { kind: 'singleSymbolNode'; target: GraphContextNodeTarget }
  | { kind: 'singlePluginNode'; target: GraphContextNodeTarget }
  | { kind: 'multiFileNodes'; targets: readonly GraphContextNodeTarget[] }
  | { kind: 'multiFolderNodes'; targets: readonly GraphContextNodeTarget[] }
  | { kind: 'multiPackageNodes'; targets: readonly GraphContextNodeTarget[] }
  | { kind: 'mixedNodeSelection'; targets: readonly GraphContextNodeTarget[] };

export function decideGraphContextMenu(
  selection: GraphContextSelection,
  nodes?: readonly GraphContextMenuNode[],
): GraphContextMenuDecision {
  if (selection.kind === 'background') {
    return { kind: 'background' };
  }

  if (selection.kind === 'edge') {
    return { kind: 'edge', edgeId: selection.edgeId, targets: selection.targets };
  }

  return decideNodeGraphContextMenu(selection.targets, nodes);
}
