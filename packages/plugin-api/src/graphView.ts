/**
 * @fileoverview Graph View contribution contracts for CodeGraphy plugins.
 * @module @codegraphy/plugin-api/graphView
 */

import type { CodeGraphyAccessKey } from './access';
import type {
  GraphEdgeKind,
  GraphMetadata,
  IGraphData,
  IGraphEdge,
  IGraphNode,
  NodeType,
} from './graph';

export type GraphViewAccessRequirement =
  CodeGraphyAccessKey
  | readonly CodeGraphyAccessKey[];

export interface IGraphViewContributionBase {
  id: string;
  label: string;
  requiresAccess?: GraphViewAccessRequirement;
  metadata?: GraphMetadata;
}

export interface IGraphViewContributionContext {
  visibleGraph: IGraphData;
  workspaceRoot?: string;
}

export interface IGraphViewRuntimeNode extends IGraphNode {
  ownerPluginId?: string;
  runtimeNodeType?: string;
}

export interface IGraphViewRuntimeEdge extends IGraphEdge {
  ownerPluginId?: string;
  runtimeEdgeType?: string;
}

export interface IGraphViewRuntimeNodeContribution extends IGraphViewContributionBase {
  createNodes(context: IGraphViewContributionContext): readonly IGraphViewRuntimeNode[];
}

export interface IGraphViewRuntimeEdgeContribution extends IGraphViewContributionBase {
  createEdges(context: IGraphViewContributionContext): readonly IGraphViewRuntimeEdge[];
}

export interface IGraphViewProjectionContribution extends IGraphViewContributionBase {
  project(context: IGraphViewContributionContext): IGraphData;
}

export interface IGraphViewForceAdapterContext extends IGraphViewContributionContext {
  nodes: readonly IGraphViewRuntimeNode[];
  edges: readonly IGraphViewRuntimeEdge[];
}

export interface IGraphViewForceAdapter {
  tick?(alpha?: number): void;
  dispose(): void;
}

export interface IGraphViewForceAdapterContribution extends IGraphViewContributionBase {
  create(context: IGraphViewForceAdapterContext): IGraphViewForceAdapter;
}

export type GraphViewUiSlot =
  | 'graph.toolbar'
  | 'graph.panelSlot'
  | 'graph.stage.worldOverlay'
  | 'graph.stage.viewportOverlay';

export type GraphViewUiContributionView =
  | { kind: 'command'; command: string }
  | { kind: 'panel'; panelId: string }
  | { kind: 'webview'; viewId: string };

export interface IGraphViewUiSlotContribution extends IGraphViewContributionBase {
  slot: GraphViewUiSlot;
  view: GraphViewUiContributionView;
  order?: number;
}

export type GraphViewContextMenuTargetSelector =
  | { kind: 'background' }
  | {
    kind: 'node';
    nodeTypes?: readonly NodeType[];
    runtimeNodeTypes?: readonly string[];
  }
  | {
    kind: 'edge';
    edgeKinds?: readonly GraphEdgeKind[];
    runtimeEdgeTypes?: readonly string[];
  }
  | {
    kind: 'multiSelection';
    nodeTypes?: readonly NodeType[];
    runtimeNodeTypes?: readonly string[];
  }
  | { kind: 'runtimeNodeType'; runtimeNodeTypes: readonly string[] }
  | { kind: 'runtimeEdgeType'; runtimeEdgeTypes: readonly string[] };

export interface IGraphViewContextMenuRunContext {
  target: GraphViewContextMenuTargetSelector;
  selectedNodeIds: readonly string[];
  selectedEdgeIds: readonly string[];
}

export interface IGraphViewContextMenuContribution extends IGraphViewContributionBase {
  targets: readonly GraphViewContextMenuTargetSelector[];
  run(context: IGraphViewContextMenuRunContext): void | Promise<void>;
}

export interface IGraphViewContributions {
  runtimeNodes?: readonly IGraphViewRuntimeNodeContribution[];
  runtimeEdges?: readonly IGraphViewRuntimeEdgeContribution[];
  projections?: readonly IGraphViewProjectionContribution[];
  forces?: readonly IGraphViewForceAdapterContribution[];
  contextMenu?: readonly IGraphViewContextMenuContribution[];
  ui?: readonly IGraphViewUiSlotContribution[];
}
