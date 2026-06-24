import type { IGraphData, IGraphNode } from '../../../../../shared/graph/contracts';

function createGraphGroupSymbolSignature(symbol: IGraphNode['symbol']): string | undefined {
  if (!symbol) {
    return undefined;
  }

  return JSON.stringify([
    symbol.kind,
    symbol.pluginKind,
    symbol.source,
    symbol.language,
    symbol.filePath,
  ]);
}

function areGraphGroupSymbolInputsEqual(
  left: IGraphNode['symbol'],
  right: IGraphNode['symbol'],
): boolean {
  return createGraphGroupSymbolSignature(left) === createGraphGroupSymbolSignature(right);
}

function areGraphGroupNodeInputsEqual(left: IGraphNode, right: IGraphNode): boolean {
  return left.nodeType === right.nodeType
    && areGraphGroupSymbolInputsEqual(left.symbol, right.symbol);
}

export function doGraphViewGroupsNeedRecompute(
  currentRawGraphData: IGraphData,
  nextRawGraphData: IGraphData,
): boolean {
  if (currentRawGraphData.nodes.length !== nextRawGraphData.nodes.length) {
    return true;
  }

  const nextNodesById = new Map(nextRawGraphData.nodes.map(node => [node.id, node]));
  for (const currentNode of currentRawGraphData.nodes) {
    const nextNode = nextNodesById.get(currentNode.id);
    if (!nextNode || !areGraphGroupNodeInputsEqual(currentNode, nextNode)) {
      return true;
    }
  }

  return false;
}
