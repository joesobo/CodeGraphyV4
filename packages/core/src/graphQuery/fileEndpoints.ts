import type { IGraphData, IGraphEdge } from '../graph/contracts';
import type { GraphQueryConnectionConfig } from './model';

function containingFile(graphData: IGraphData, nodeId: string): string {
  return graphData.nodes.find(node => node.id === nodeId)?.symbol?.filePath ?? nodeId;
}

export function isFileSelector(graphData: IGraphData, selector: string): boolean {
  const exactNode = graphData.nodes.find(node => node.id === selector);
  return (exactNode !== undefined && (exactNode.nodeType ?? 'file') === 'file')
    || graphData.nodes.some(node => node.symbol?.filePath === selector);
}

export function resolveSelectorNodeIds(
  graphData: IGraphData,
  selector: string,
  expandFileSelectors: boolean,
): string[] {
  if (!expandFileSelectors || !isFileSelector(graphData, selector)) {
    return graphData.nodes.some(node => node.id === selector) ? [selector] : [];
  }

  return graphData.nodes
    .filter(node => node.id === selector || node.symbol?.filePath === selector)
    .map(node => node.id)
    .sort((left, right) => left.localeCompare(right));
}

export function applyConnectionEndpointFilters(
  graphData: IGraphData,
  edges: readonly IGraphEdge[],
  config: GraphQueryConnectionConfig,
): IGraphEdge[] {
  const fromIds = config.from
    ? new Set(resolveSelectorNodeIds(graphData, config.from, config.expandFileSelectors === true))
    : undefined;
  const toIds = config.to
    ? new Set(resolveSelectorNodeIds(graphData, config.to, config.expandFileSelectors === true))
    : undefined;

  return edges.filter(edge => (
    (!fromIds || fromIds.has(edge.from))
    && (!toIds || toIds.has(edge.to))
    && (!config.edgeType || edge.kind === config.edgeType)
  ));
}

export function shouldProjectConnectionEndpoints(
  graphData: IGraphData,
  config: GraphQueryConnectionConfig,
): boolean {
  const selectors = [config.from, config.to].filter((selector): selector is string => selector !== undefined);
  return config.projectFileEndpoints === true
    && selectors.length > 0
    && selectors.every(selector => isFileSelector(graphData, selector));
}

export function projectEdgesToFiles(graphData: IGraphData, edges: readonly IGraphEdge[]): IGraphEdge[] {
  return edges.flatMap((edge) => {
    const from = containingFile(graphData, edge.from);
    const to = containingFile(graphData, edge.to);
    return from === to ? [] : [{
      ...edge,
      id: `${from}->${to}#${edge.kind}`,
      from,
      to,
    }];
  });
}

export function projectPathToFiles(graphData: IGraphData, path: readonly string[]): string[] {
  return path.reduce<string[]>((projected, nodeId) => {
    const filePath = containingFile(graphData, nodeId);
    if (projected[projected.length - 1] !== filePath) projected.push(filePath);
    return projected;
  }, []);
}
