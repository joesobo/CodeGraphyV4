import type { IFileInfo, IGraphData, IGraphNode } from '../../shared/types';
import type { TooltipContext } from '../pluginHost/types';

export interface GraphTooltipRect {
  x: number;
  y: number;
  radius: number;
}

export interface GraphTooltipState {
  visible: boolean;
  nodeRect: GraphTooltipRect;
  path: string;
  info: IFileInfo | null;
  pluginSections: Array<{ title: string; content: string }>;
}

export interface GraphTooltipContextOptions {
  node: Pick<IGraphNode, 'id' | 'label' | 'color'>;
  snapshot: Pick<IGraphData, 'nodes' | 'edges'>;
}

export interface GraphTooltipStateOptions {
  nodeId: string;
  rect: GraphTooltipRect | null;
  cachedInfo: IFileInfo | null;
  pluginSections: Array<{ title: string; content: string }>;
}

export interface GraphTooltipStateResult {
  tooltipData: GraphTooltipState;
  shouldRequestFileInfo: boolean;
}

const EMPTY_TOOLTIP_RECT: GraphTooltipRect = { x: 0, y: 0, radius: 0 };

export function buildGraphTooltipContext(options: GraphTooltipContextOptions): TooltipContext {
  const { node, snapshot } = options;
  const baseNode =
    snapshot.nodes.find((graphNode) => graphNode.id === node.id) ??
    { id: node.id, label: node.label, color: node.color };
  const connectedEdges = snapshot.edges.filter((edge) => edge.from === node.id || edge.to === node.id);
  const neighborIds = new Set<string>();
  for (const edge of connectedEdges) {
    neighborIds.add(edge.from === node.id ? edge.to : edge.from);
  }

  return {
    node: baseNode,
    neighbors: snapshot.nodes.filter((graphNode) => neighborIds.has(graphNode.id)),
    edges: connectedEdges,
  };
}

export function buildGraphTooltipState(options: GraphTooltipStateOptions): GraphTooltipStateResult {
  return {
    tooltipData: {
      visible: true,
      nodeRect: options.rect ?? EMPTY_TOOLTIP_RECT,
      path: options.nodeId,
      info: options.cachedInfo,
      pluginSections: options.pluginSections,
    },
    shouldRequestFileInfo: options.cachedInfo === null,
  };
}

export function hideGraphTooltipState(previousState: GraphTooltipState): GraphTooltipState {
  return {
    ...previousState,
    visible: false,
    pluginSections: [],
  };
}
