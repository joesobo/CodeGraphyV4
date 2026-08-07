import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';

export type GraphContextTargetKind = 'background' | 'node' | 'edge';
type GraphViewContextMenuContribution = ExtensionGraphViewContributionSet['contextMenu'][number]['contribution'];

export type BuiltInContextMenuAction =
  | 'open'
  | 'compare'
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

export interface GraphContextMenuIdentity {
  label: string;
  exactId?: string;
}

export type GraphContextMenuHeader =
  | { kind: 'background'; workspaceName: string }
  | { kind: 'edge'; source: GraphContextMenuIdentity; target: GraphContextMenuIdentity; relationship?: string }
  | { kind: 'multiNode'; count: number }
  | { kind: 'node'; target: GraphContextMenuIdentity };

export type GraphContextMenuEntry =
  | {
      kind: 'header';
      id: string;
      header: GraphContextMenuHeader;
    }
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
  visibleEdgeId?: string;
  graphPosition?: { x: number; y: number };
}

export interface GraphContextMenuNode {
  id: string;
  label?: string;
  color?: string;
  x?: number;
  y?: number;
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
  favorites: ReadonlySet<string>;
  graphViewContributions?: ExtensionGraphViewContributionSet;
  workspaceName?: string;
  nodes?: readonly GraphContextMenuNode[];
  edges?: readonly GraphContextMenuEdge[];
}
