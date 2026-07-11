/**
 * @fileoverview Graph View contribution contracts for CodeGraphy plugins.
 * @module @codegraphy-dev/plugin-api/graphView
 */

import type { CodeGraphyAccessKey } from './access';
import type {
  GraphEdgeKind,
  GraphMetadata,
  CoreNodeType,
  IGraphData,
  IGraphEdge,
  IGraphNode,
  NodeType,
} from './graph';
import type { GraphNodeShape2D, GraphNodeShape3D } from './graph';

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
  graphMode?: '2d' | '3d';
  timelineActive?: boolean;
  workspaceRoot?: string;
}

/** A declarative legend/style rule contributed by a plugin. */
export interface IGraphViewDefaultGroupDefinition {
  id: string;
  pattern: string;
  displayLabel?: string;
  color: string;
  matchNodeType?: CoreNodeType;
  shape2D?: GraphNodeShape2D;
  shape3D?: GraphNodeShape3D;
  imagePath?: string;
  imageUrl?: string;
}

export interface IGraphViewDefaultGroupContext extends IGraphViewContributionContext {
  /** Whether folder nodes are visible and should receive styling rules. */
  includeFolderMatches: boolean;
}

/** Produces graph-aware default styling without importing extension internals. */
export interface IGraphViewDefaultGroupContribution extends IGraphViewContributionBase {
  createGroups(
    context: IGraphViewDefaultGroupContext,
  ): readonly IGraphViewDefaultGroupDefinition[];
}

export interface IGraphViewRuntimeNodePositionState {
  x?: number | undefined;
  y?: number | undefined;
  z?: number | undefined;
  fx?: number | undefined;
  fy?: number | undefined;
  fz?: number | undefined;
  vx?: number | undefined;
  vy?: number | undefined;
  vz?: number | undefined;
}

export interface IGraphViewRuntimeNode extends IGraphNode, IGraphViewRuntimeNodePositionState {
  ownerPluginId?: string;
  runtimeNodeType?: string;
}

export interface IGraphViewRuntimeEdge extends IGraphEdge {
  ownerPluginId?: string;
  runtimeEdgeType?: string;
}

export interface IGraphViewPhysicsSettings {
  repelForce: number;
  linkDistance: number;
  linkForce: number;
  damping: number;
  centerForce: number;
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
  physicsSettings?: IGraphViewPhysicsSettings;
}

export interface IGraphViewForceAdapter {
  initialize?(nodes: IGraphViewRuntimeNode[]): void;
  tick?(alpha?: number): void;
  dispose(): void;
}

export interface IGraphViewForceAdapterContribution extends IGraphViewContributionBase {
  create(context: IGraphViewForceAdapterContext): IGraphViewForceAdapter;
}

export interface IGraphViewNodeDragState extends IGraphViewRuntimeNode {
  isDragging?: boolean;
  isPinned?: boolean;
}

export interface IGraphViewNodeDragEndContext {
  graphMode: '2d' | '3d';
  node: IGraphViewNodeDragState;
  nodes: readonly IGraphViewNodeDragState[];
  timelineActive: boolean;
}

export interface IGraphViewNodeDragEndResult {
  keepFixedPosition?: boolean;
}

export interface IGraphViewNodeDragEndContribution extends IGraphViewContributionBase {
  onNodeDragEnd(context: IGraphViewNodeDragEndContext): IGraphViewNodeDragEndResult | void;
}

export type GraphViewUiSlot =
  | 'graph.toolbar'
  | 'graph.panelSlot'
  | 'graph.stage.worldBackground'
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
  graphMode: '2d' | '3d';
  timelineActive: boolean;
  selectedNodeIds: readonly string[];
  selectedEdgeIds: readonly string[];
  graphPosition?: { x: number; y: number };
  selectedNodePositions?: Readonly<Record<string, { x: number; y: number; z?: number }>>;
}

export interface IGraphViewContextMenuContribution extends IGraphViewContributionBase {
  targets: readonly GraphViewContextMenuTargetSelector[];
  placement?: {
    menu: 'create';
  };
  getLabel?(context: IGraphViewContextMenuRunContext): string;
  isVisible?(context: IGraphViewContextMenuRunContext): boolean;
  run(context: IGraphViewContextMenuRunContext): void | Promise<void>;
}

export interface IGraphViewContributions {
  defaultGroups?: readonly IGraphViewDefaultGroupContribution[];
  runtimeNodes?: readonly IGraphViewRuntimeNodeContribution[];
  runtimeEdges?: readonly IGraphViewRuntimeEdgeContribution[];
  projections?: readonly IGraphViewProjectionContribution[];
  forces?: readonly IGraphViewForceAdapterContribution[];
  nodeDragEnd?: readonly IGraphViewNodeDragEndContribution[];
  contextMenu?: readonly IGraphViewContextMenuContribution[];
  ui?: readonly IGraphViewUiSlotContribution[];
}
