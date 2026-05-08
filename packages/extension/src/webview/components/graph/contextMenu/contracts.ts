import type { IPluginContextMenuItem } from '../../../../shared/plugins/contextMenu';

export type GraphContextTargetKind = 'background' | 'node' | 'edge';
export type GraphContextMutationAvailability = 'enabled' | 'disabled' | 'hidden';

export const DEFAULT_GRAPH_CONTEXT_MUTATION_AVAILABILITY: GraphContextMutationAvailability = 'enabled';

export type BuiltInContextMenuAction =
  | 'open'
  | 'openEdgeSource'
  | 'openEdgeTarget'
  | 'reveal'
  | 'copyRelative'
  | 'copyAbsolute'
  | 'copyEdgeSource'
  | 'copyEdgeTarget'
  | 'copyEdgeBoth'
  | 'toggleFavorite'
  | 'pinNode'
  | 'unpinNode'
  | 'createGraphSection'
  | 'expandGraphSection'
  | 'collapseGraphSection'
  | 'deleteGraphSection'
  | 'focus'
  | 'addToFilter'
  | 'addNodeLegend'
  | 'rename'
  | 'delete'
  | 'refresh'
  | 'fitView'
  | 'createFile'
  | 'createFolder';

export type GraphContextMenuAction =
  | { kind: 'builtin'; action: BuiltInContextMenuAction }
  | { kind: 'plugin'; pluginId: string; index: number; targetId: string; targetType: 'node' | 'edge' };

export type GraphContextMenuEntry =
  | {
      kind: 'item';
      id: string;
      label: string;
      action: GraphContextMenuAction;
      destructive?: boolean;
      disabled?: boolean;
      shortcut?: string;
    }
  | {
      kind: 'separator';
      id: string;
    };

export interface GraphContextSelection {
  kind: GraphContextTargetKind;
  targets: string[];
  edgeId?: string;
  graphPosition?: { x: number; y: number };
}

export interface GraphContextMenuNode {
  id: string;
  label?: string;
  color?: string;
  isCollapsedGraphSection?: boolean;
  isGraphSection?: boolean;
  nodeType?: string;
}

export interface BuildGraphContextMenuOptions {
  selection: GraphContextSelection;
  timelineActive: boolean;
  mutationAvailability?: GraphContextMutationAvailability;
  favorites: ReadonlySet<string>;
  pinnedNodeIds?: ReadonlySet<string>;
  pluginItems: readonly IPluginContextMenuItem[];
  nodes?: readonly GraphContextMenuNode[];
}
