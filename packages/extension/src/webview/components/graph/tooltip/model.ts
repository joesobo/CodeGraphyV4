import type { IFileInfo } from '../../../../shared/files/info';
import type { IGraphData, IGraphNode } from '../../../../shared/graph/contracts';
import type { TooltipAction, TooltipContext } from '../../../pluginHost/api/contracts/webview';

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
  incomingCount?: number;
  outgoingCount?: number;
  pluginActions?: TooltipAction[];
  pluginSections: Array<{ title: string; content: string }>;
  symbol?: {
    name: string;
    kind: string;
    filePath: string;
  };
}

export interface GraphTooltipContextOptions {
  node: Pick<IGraphNode, 'id' | 'label' | 'color'>;
  snapshot: Pick<IGraphData, 'nodes' | 'edges'>;
}

export interface GraphTooltipStateOptions {
  nodeId: string;
  snapshot: Pick<IGraphData, 'nodes' | 'edges'>;
  rect: GraphTooltipRect | null;
  cachedInfo: IFileInfo | null;
  pluginActions?: TooltipAction[];
  pluginSections: Array<{ title: string; content: string }>;
}

export interface GraphTooltipStateResult {
  tooltipData: GraphTooltipState;
  shouldRequestFileInfo: boolean;
}

const EMPTY_TOOLTIP_RECT: GraphTooltipRect = { x: 0, y: 0, radius: 0 };

function countTooltipEdges(
  nodeId: string,
  snapshot: Pick<IGraphData, 'edges'>,
): { incomingCount: number; outgoingCount: number } {
  let incomingCount = 0;
  let outgoingCount = 0;
  for (const edge of snapshot.edges) {
    if (edge.from === nodeId) {
      outgoingCount++;
    }
    if (edge.to === nodeId) {
      incomingCount++;
    }
  }
  return { incomingCount, outgoingCount };
}

function readTooltipSymbol(
  nodeId: string,
  snapshot: Pick<IGraphData, 'nodes'>,
): GraphTooltipState['symbol'] {
  const symbol = snapshot.nodes.find((node) => node.id === nodeId)?.symbol;
  return symbol
    ? { name: symbol.name, kind: symbol.kind, filePath: symbol.filePath }
    : undefined;
}

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
  const edgeCounts = countTooltipEdges(options.nodeId, options.snapshot);
  const symbol = readTooltipSymbol(options.nodeId, options.snapshot);
  return {
    tooltipData: {
      visible: true,
      nodeRect: options.rect ?? EMPTY_TOOLTIP_RECT,
      path: options.nodeId,
      info: options.cachedInfo,
      ...edgeCounts,
      pluginActions: options.pluginActions ?? [],
      pluginSections: options.pluginSections,
      ...(symbol ? { symbol } : {}),
    },
    shouldRequestFileInfo: options.cachedInfo === null && !symbol,
  };
}

export function hideGraphTooltipState(previousState: GraphTooltipState): GraphTooltipState {
  return {
    ...previousState,
    pluginActions: [],
    visible: false,
    pluginSections: [],
  };
}
