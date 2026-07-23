import type { IGraphData } from '../../../../shared/graph/contracts';
import type { GraphTooltipState } from './state';

export function readTooltipSymbol(
  nodeId: string,
  snapshot: Pick<IGraphData, 'nodes'>,
): GraphTooltipState['symbol'] {
  const symbol = snapshot.nodes.find((node) => node.id === nodeId)?.symbol;
  return symbol
    ? {
        name: symbol.name,
        kind: symbol.kind,
        filePath: symbol.filePath,
      }
    : undefined;
}
