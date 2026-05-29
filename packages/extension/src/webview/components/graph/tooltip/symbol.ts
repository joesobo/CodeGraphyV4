import type { IGraphData } from '../../../../shared/graph/contracts';
import type { GraphTooltipState } from './state';

const SYMBOL_SOURCE_LABELS: Record<string, string> = {
  'codegraphy.gdscript': 'GDScript (Godot)',
};

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
        ...(symbol.source && SYMBOL_SOURCE_LABELS[symbol.source] ? { plugin: SYMBOL_SOURCE_LABELS[symbol.source] } : {}),
      }
    : undefined;
}
