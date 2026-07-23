import type { CodeGraphyAccessKey } from '@codegraphy-dev/plugin-api/access';
import type {
  GraphEdgeKind,
  GraphMetadata,
  IGraphData,
  IGraphEdge,
  IGraphNode,
  NodeType,
} from '@codegraphy-dev/plugin-api/graph';

export type GraphViewAccessRequirement =
  | CodeGraphyAccessKey
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
  color?: string;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  vx?: number;
  vy?: number;
  ownerPluginId?: string;
  runtimeNodeType?: string;
}

export interface IGraphViewRuntimeEdge extends IGraphEdge {
  color?: string;
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
  node: IGraphViewNodeDragState;
  nodes: readonly IGraphViewNodeDragState[];
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
  | { kind: 'node'; nodeTypes?: readonly NodeType[]; runtimeNodeTypes?: readonly string[] }
  | { kind: 'edge'; edgeKinds?: readonly GraphEdgeKind[]; runtimeEdgeTypes?: readonly string[] }
  | { kind: 'multiSelection'; nodeTypes?: readonly NodeType[]; runtimeNodeTypes?: readonly string[] }
  | { kind: 'runtimeNodeType'; runtimeNodeTypes: readonly string[] }
  | { kind: 'runtimeEdgeType'; runtimeEdgeTypes: readonly string[] };

export interface IGraphViewContextMenuRunContext {
  target: GraphViewContextMenuTargetSelector;
  selectedNodeIds: readonly string[];
  selectedEdgeIds: readonly string[];
  graphPosition?: { x: number; y: number };
  selectedNodePositions?: Readonly<Record<string, { x: number; y: number }>>;
}

export interface IGraphViewContextMenuContribution extends IGraphViewContributionBase {
  targets: readonly GraphViewContextMenuTargetSelector[];
  placement?: { menu: 'create' };
  getLabel?(context: IGraphViewContextMenuRunContext): string;
  isVisible?(context: IGraphViewContextMenuRunContext): boolean;
  run(context: IGraphViewContextMenuRunContext): void | Promise<void>;
}

export interface IGraphViewContributions {
  runtimeNodes?: readonly IGraphViewRuntimeNodeContribution[];
  runtimeEdges?: readonly IGraphViewRuntimeEdgeContribution[];
  projections?: readonly IGraphViewProjectionContribution[];
  forces?: readonly IGraphViewForceAdapterContribution[];
  nodeDragEnd?: readonly IGraphViewNodeDragEndContribution[];
  contextMenu?: readonly IGraphViewContextMenuContribution[];
  ui?: readonly IGraphViewUiSlotContribution[];
}

export interface ExtensionGraphViewContributionEntry<TContribution> {
  pluginId: string;
  contribution: TContribution;
}

export interface ExtensionGraphViewContributionSet {
  runtimeNodes: ExtensionGraphViewContributionEntry<IGraphViewRuntimeNodeContribution>[];
  runtimeEdges: ExtensionGraphViewContributionEntry<IGraphViewRuntimeEdgeContribution>[];
  projections: ExtensionGraphViewContributionEntry<IGraphViewProjectionContribution>[];
  forces: ExtensionGraphViewContributionEntry<IGraphViewForceAdapterContribution>[];
  nodeDragEnd: ExtensionGraphViewContributionEntry<IGraphViewNodeDragEndContribution>[];
  contextMenu: ExtensionGraphViewContributionEntry<IGraphViewContextMenuContribution>[];
  ui: ExtensionGraphViewContributionEntry<IGraphViewUiSlotContribution>[];
}
