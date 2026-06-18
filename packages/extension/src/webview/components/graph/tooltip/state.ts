import type { IFileInfo } from '../../../../shared/files/info';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { TooltipAction } from '../../../pluginHost/api/contracts/webview';
import { countTooltipEdges } from './edgeCounts';
import { readTooltipSymbol } from './symbol';

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
    plugin?: string;
  };
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

function getGitIgnoredTooltipSections(
  node: IGraphData['nodes'][number] | undefined,
): Array<{ title: string; content: string }> {
  if (node?.metadata?.gitIgnored !== true) {
    return [];
  }

  return [{ title: 'Git ignored', content: 'Reported ignored by Git' }];
}

export function buildGraphTooltipState(options: GraphTooltipStateOptions): GraphTooltipStateResult {
  const edgeCounts = countTooltipEdges(options.nodeId, options.snapshot);
  const symbol = readTooltipSymbol(options.nodeId, options.snapshot);
  const node = options.snapshot.nodes.find(candidate => candidate.id === options.nodeId);
  return {
    tooltipData: {
      visible: true,
      nodeRect: options.rect ?? EMPTY_TOOLTIP_RECT,
      path: options.nodeId,
      info: options.cachedInfo,
      ...edgeCounts,
      pluginActions: options.pluginActions ?? [],
      pluginSections: [
        ...getGitIgnoredTooltipSections(node),
        ...options.pluginSections,
      ],
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
