import type { IPluginContextMenuItem } from '../../../../shared/plugins/contextMenu';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';

export type GraphContextTargetKind = 'background' | 'node' | 'edge';
export type GraphContextMutationAvailability = 'enabled' | 'disabled' | 'hidden';
type GraphViewContextMenuContribution = CoreGraphViewContributionSet['contextMenu'][number]['contribution'];

export const DEFAULT_GRAPH_CONTEXT_MUTATION_AVAILABILITY: GraphContextMutationAvailability = 'enabled';

export type BuiltInContextMenuAction =
  | 'open'
  | 'openToSide'
  | 'openEdgeSource'
  | 'openEdgeTarget'
  | 'reveal'
  | 'copyRelative'
  | 'copyAbsolute'
  | 'copySymbolId'
  | 'copySymbolName'
  | 'copyEdgeSource'
  | 'copyEdgeTarget'
  | 'copyEdgeBoth'
  | 'cutFiles'
  | 'copyFiles'
  | 'pasteFiles'
  | 'toggleFavorite'
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
  | { kind: 'plugin'; pluginId: string; index: number; targetId: string; targetType: 'node' | 'edge' }
  | {
      kind: 'graphViewPlugin';
      pluginId: string;
      contributionId: string;
      context: Parameters<GraphViewContextMenuContribution['run']>[0];
      run: GraphViewContextMenuContribution['run'];
    };

export interface GraphContextMenuActionInvocation {
  action: GraphContextMenuAction;
  contextSelection: GraphContextSelection;
}

export type GraphContextMenuEntry =
  | {
      kind: 'item';
      id: string;
      label: string;
      action: GraphContextMenuAction;
      contextSelection?: GraphContextSelection;
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
  x?: number;
  y?: number;
  z?: number;
  ownerPluginId?: string;
  nodeType?: string;
  runtimeNodeType?: string;
  symbol?: {
    id: string;
    name: string;
    filePath: string;
  };
  isCollapsed?: boolean;
}

export interface GraphContextMenuEdge {
  id: string;
  kind?: string;
  ownerPluginId?: string;
  runtimeEdgeType?: string;
}

export interface BuildGraphContextMenuOptions {
  selection: GraphContextSelection;
  graphMode?: '2d' | '3d';
  timelineActive: boolean;
  mutationAvailability?: GraphContextMutationAvailability;
  favorites: ReadonlySet<string>;
  pluginItems: readonly IPluginContextMenuItem[];
  graphViewContributions?: CoreGraphViewContributionSet;
  nodes?: readonly GraphContextMenuNode[];
  edges?: readonly GraphContextMenuEdge[];
}
